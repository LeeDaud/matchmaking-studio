import { createClient as createSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { extractBucketObjectPath } from '@/lib/storage/object-path'

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif', 'pdf']

function json(message: string, status: number) {
  return Response.json({ success: false, message }, { status })
}

function sanitizeFileName(fileName: string) {
  const [baseName = 'file', extension = 'jpg'] = fileName.split(/\.(?=[^.]+$)/)
  const safeBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'file'
  const safeExtension = extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 8) || 'jpg'
  return `${safeBaseName}.${safeExtension}`
}

function isSupportedFile(file: File) {
  if (file.type.startsWith('image/') || file.type === 'application/pdf') return true
  const ext = file.name.split('.').pop()?.toLowerCase()
  return !!ext && SUPPORTED_EXTENSIONS.includes(ext)
}

export async function POST(request: Request) {
  const supabase = await createSupabaseClient()
  const serviceRoleClient = createServiceRoleClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json('未登录', 401)

  const formData = await request.formData()
  const profileId = String(formData.get('profileId') ?? '').trim()
  const certType = String(formData.get('certType') ?? '').trim()
  const file = formData.get('file')

  if (!profileId) return json('缺少客户 ID', 400)

  const validTypes = ['identity', 'education', 'income', 'assets', 'marital_history', 'health', 'other']
  if (!validTypes.includes(certType)) return json('认证类型无效', 400)

  if (!(file instanceof File)) return json('未读取到文件', 400)
  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) return json('文件大小需要控制在 20MB 以内', 400)
  if (!isSupportedFile(file)) return json('仅支持 JPG、PNG、WEBP、HEIC、PDF 格式', 400)

  // 权限检查
  const [{ data: roleData }, { data: profile }] = await Promise.all([
    withSupabaseRetry(
      () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      { label: 'cert upload role query' }
    ),
    withSupabaseRetry(
      () => serviceRoleClient.from('profiles').select('id, matchmaker_id').eq('id', profileId).maybeSingle(),
      { label: 'cert upload profile query' }
    ),
  ])

  if (!profile) return json('客户不存在', 404)
  const isAdmin = roleData?.role === 'admin'
  if (!isAdmin && profile.matchmaker_id !== user.id) return json('无权操作该客户', 403)

  // 上传文件到 certification-materials bucket
  const safeFileName = sanitizeFileName(file.name)
  const objectPath = `${user.id}/${profileId}/${certType}/${Date.now()}-${safeFileName}`
  const fileBuffer = await file.arrayBuffer()

  const { error: uploadError } = await withSupabaseRetry(
    () => serviceRoleClient.storage.from('certification-materials').upload(objectPath, fileBuffer, {
      contentType: file.type || undefined,
      upsert: false,
    }),
    { label: 'certification material upload' }
  )

  if (uploadError) return json(uploadError.message, 500)

  const { data: { publicUrl } } = serviceRoleClient.storage
    .from('certification-materials')
    .getPublicUrl(objectPath)

  // 更新或创建 certification 记录
  const { data: existing } = await withSupabaseRetry(
    () => serviceRoleClient
      .from('profile_certifications')
      .select('id, material_refs, status')
      .eq('profile_id', profileId)
      .eq('type', certType)
      .maybeSingle(),
    { label: 'cert record lookup' }
  )

  if (existing) {
    const newRefs = [...(existing.material_refs ?? []), publicUrl]
    await withSupabaseRetry(
      () => serviceRoleClient
        .from('profile_certifications')
        .update({
          material_refs: newRefs,
          status: 'pending_review',
          submitted_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', existing.id),
      { label: 'cert record update' }
    )
  } else {
    await withSupabaseRetry(
      () => serviceRoleClient
        .from('profile_certifications')
        .insert({
          profile_id: profileId,
          type: certType as any,
          status: 'pending_review',
          material_refs: [publicUrl],
          submitted_at: new Date().toISOString(),
          related_field_keys: getRelatedFieldKeys(certType),
        }),
      { label: 'cert record insert' }
    )
  }

  return Response.json({ success: true, fileUrl: publicUrl })
}

function getRelatedFieldKeys(certType: string): string[] {
  const map: Record<string, string[]> = {
    identity: ['full_name', 'gender', 'birth_year_month'],
    education: ['education_level_v2', 'bachelor_school', 'master_school', 'doctor_school'],
    income: ['monthly_income', 'annual_income', 'income_source_type'],
    assets: ['has_property', 'property_count', 'has_vehicle', 'vehicle_brand', 'vehicle_model', 'family_asset_band'],
    marital_history: ['marital_history_enum'],
    health: [],
    other: [],
  }
  return map[certType] ?? []
}
