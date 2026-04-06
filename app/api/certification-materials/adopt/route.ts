/**
 * POST /api/certification-materials/adopt
 *
 * 一键采纳：将认证材料中 AI 提取的某个字段值写入档案。
 *
 * Body: {
 *   certId: string,
 *   fieldKey: string,
 *   materialValue: string,
 *   action: 'adopt' | 'ignore' | 'flag'
 * }
 */

import { createClient as createSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import type { CertificationExtractionResult } from '@/lib/ai/certification-extraction'

const PROFILE_WRITABLE_FIELDS = new Set([
  'name', 'age', 'gender', 'nationality', 'height_cm',
  'current_city', 'occupation', 'monthly_income', 'annual_income',
  'education_level_v2', 'bachelor_school', 'master_school', 'doctor_school',
  'has_property', 'property_count', 'has_vehicle', 'vehicle_brand', 'vehicle_model',
  'family_asset_band', 'birth_year_month',
])

const INTENTION_WRITABLE_FIELDS = new Set([
  'marital_history_enum',
])

export async function POST(request: Request) {
  const supabase = await createSupabaseClient()
  const serviceRoleClient = createServiceRoleClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ success: false, message: '未登录' }, { status: 401 })

  let body: {
    certId?: string
    fieldKey?: string
    materialValue?: string | null
    action?: 'adopt' | 'ignore' | 'flag'
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, message: '无效请求体' }, { status: 400 })
  }

  const { certId, fieldKey, materialValue, action = 'adopt' } = body

  if (!certId || !fieldKey) {
    return Response.json({ success: false, message: '缺少必要参数' }, { status: 400 })
  }

  // 取认证记录
  const { data: cert, error: certError } = await withSupabaseRetry(
    () => serviceRoleClient
      .from('profile_certifications')
      .select('id, profile_id, review_notes')
      .eq('id', certId)
      .single(),
    { label: 'cert adopt: fetch cert' }
  )

  if (certError || !cert) {
    return Response.json({ success: false, message: '认证记录不存在' }, { status: 404 })
  }

  // 权限检查
  const [{ data: roleData }, { data: profile }] = await Promise.all([
    withSupabaseRetry(
      () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      { label: 'cert adopt: role query' }
    ),
    withSupabaseRetry(
      () => serviceRoleClient.from('profiles').select('id, matchmaker_id').eq('id', cert.profile_id).single(),
      { label: 'cert adopt: profile query' }
    ),
  ])

  if (!profile) return Response.json({ success: false, message: '客户不存在' }, { status: 404 })
  const isAdmin = roleData?.role === 'admin'
  if (!isAdmin && profile.matchmaker_id !== user.id) {
    return Response.json({ success: false, message: '无权操作该客户' }, { status: 403 })
  }

  // 更新 review_notes 中该字段的操作状态（flag/ignore 只标记，不写库）
  let updatedNotes: CertificationExtractionResult | null = null
  try {
    if (cert.review_notes) {
      const parsed = JSON.parse(cert.review_notes) as CertificationExtractionResult
      updatedNotes = {
        ...parsed,
        field_comparisons: parsed.field_comparisons.map((fc) => {
          if (fc.field_key !== fieldKey) return fc
          return { ...fc, _action: action }
        }),
      }
    }
  } catch {
    // review_notes 解析失败，忽略
  }

  const writeOps: Promise<unknown>[] = []

  // 如果是采纳，写入对应表
  if (action === 'adopt' && materialValue !== null && materialValue !== undefined) {
    if (PROFILE_WRITABLE_FIELDS.has(fieldKey)) {
      writeOps.push(
        withSupabaseRetry(
          () => serviceRoleClient
            .from('profiles')
            .update({ [fieldKey]: materialValue })
            .eq('id', cert.profile_id),
          { label: `cert adopt: write profile.${fieldKey}` }
        )
      )
    } else if (INTENTION_WRITABLE_FIELDS.has(fieldKey)) {
      writeOps.push(
        withSupabaseRetry(
          () => serviceRoleClient
            .from('intentions')
            .upsert(
              { profile_id: cert.profile_id, [fieldKey]: materialValue },
              { onConflict: 'profile_id' }
            ),
          { label: `cert adopt: write intention.${fieldKey}` }
        )
      )
    }
  }

  // 同步更新 review_notes 中的操作标记
  if (updatedNotes) {
    writeOps.push(
      withSupabaseRetry(
        () => serviceRoleClient
          .from('profile_certifications')
          .update({ review_notes: JSON.stringify(updatedNotes) })
          .eq('id', certId),
        { label: 'cert adopt: update review_notes' }
      )
    )
  }

  await Promise.all(writeOps)

  return Response.json({ success: true, action, fieldKey })
}
