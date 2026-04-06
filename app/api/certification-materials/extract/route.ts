/**
 * POST /api/certification-materials/extract
 *
 * 内部 API，由 /api/certification-materials 上传成功后异步触发。
 * 读取已上传的材料文件，用 Claude Vision 提取字段，与档案比对，
 * 将结构化结果写入 profile_certifications.review_notes。
 *
 * Body: { profileId, certId, fileUrl, fileExtension }
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { extractFromCertificationMaterial } from '@/lib/ai/certification-extraction'
import type { CertificationType } from '@/types/database'

// 只允许内部调用（同源或带内部 secret）
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET

function isAuthorized(request: Request): boolean {
  if (!INTERNAL_SECRET) return true // 未配置时放行（开发环境）
  const auth = request.headers.get('x-internal-secret')
  return auth === INTERNAL_SECRET
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ success: false, message: '未授权' }, { status: 401 })
  }

  let body: {
    profileId?: string
    certId?: string
    fileUrl?: string
    fileExtension?: string
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, message: '无效请求体' }, { status: 400 })
  }

  const { profileId, certId, fileUrl, fileExtension } = body

  if (!profileId || !certId || !fileUrl || !fileExtension) {
    return Response.json({ success: false, message: '缺少必要参数' }, { status: 400 })
  }

  const serviceRoleClient = createServiceRoleClient()

  // 取认证记录（含 type）
  const { data: cert, error: certError } = await withSupabaseRetry(
    () => serviceRoleClient
      .from('profile_certifications')
      .select('id, type, profile_id')
      .eq('id', certId)
      .single(),
    { label: 'cert extract: fetch cert' }
  )

  if (certError || !cert) {
    return Response.json({ success: false, message: '认证记录不存在' }, { status: 404 })
  }

  // 取档案快照（profiles + intentions）
  const [{ data: profile }, { data: intention }] = await Promise.all([
    withSupabaseRetry(
      () => serviceRoleClient.from('profiles').select('*').eq('id', profileId).single(),
      { label: 'cert extract: fetch profile' }
    ),
    withSupabaseRetry(
      () => serviceRoleClient.from('intentions').select('*').eq('profile_id', profileId).maybeSingle(),
      { label: 'cert extract: fetch intention' }
    ),
  ])

  if (!profile) {
    return Response.json({ success: false, message: '客户不存在' }, { status: 404 })
  }

  // 构建精简快照（只含相关字段）
  const profileSnapshot = buildProfileSnapshot(cert.type as CertificationType, profile, intention)

  // 调用 AI 提取
  let extractionResult
  try {
    extractionResult = await extractFromCertificationMaterial({
      certType: cert.type as CertificationType,
      fileUrl,
      fileExtension,
      profileSnapshot,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    // 提取失败：记录错误到 review_notes，不影响正常审核流程
    await withSupabaseRetry(
      () => serviceRoleClient
        .from('profile_certifications')
        .update({
          review_notes: JSON.stringify({
            extraction_error: message,
            extracted_at: new Date().toISOString(),
          }),
        })
        .eq('id', certId),
      { label: 'cert extract: write error note' }
    )

    return Response.json({ success: false, message: `AI 提取失败: ${message}` }, { status: 500 })
  }

  // 将结构化结果写入 review_notes
  await withSupabaseRetry(
    () => serviceRoleClient
      .from('profile_certifications')
      .update({
        review_notes: JSON.stringify(extractionResult),
      })
      .eq('id', certId),
    { label: 'cert extract: write result' }
  )

  return Response.json({ success: true, result: extractionResult })
}

// ──────────────────────────────────────────────────────────────
// 构建精简快照
// ──────────────────────────────────────────────────────────────

function buildProfileSnapshot(
  certType: CertificationType,
  profile: Record<string, unknown>,
  intention: Record<string, unknown> | null,
): Record<string, unknown> {
  const base: Record<string, unknown> = {}

  switch (certType) {
    case 'identity':
      base.full_name = profile.name ?? profile.full_name
      base.gender = profile.gender
      base.birth_year_month = profile.birth_year_month ?? profile.birthday
      base.age = profile.age
      break

    case 'education':
      base.education_level_v2 = profile.education_level_v2 ?? profile.education
      base.bachelor_school = profile.bachelor_school
      base.master_school = profile.master_school
      base.doctor_school = profile.doctor_school
      break

    case 'income':
      base.monthly_income = profile.monthly_income
      base.annual_income = profile.annual_income
      base.income_source_type = profile.income_source_type ?? profile.occupation
      break

    case 'assets':
      base.has_property = profile.has_property
      base.property_count = profile.property_count
      base.has_vehicle = profile.has_vehicle
      base.vehicle_brand = profile.vehicle_brand
      base.vehicle_model = profile.vehicle_model
      base.family_asset_band = profile.family_asset_band
      break

    case 'marital_history':
      base.marital_history_enum = profile.marital_history ?? intention?.marital_history_enum
      break

    case 'health':
    case 'other':
      // 无固定字段，让 AI 自由提取
      break
  }

  return base
}
