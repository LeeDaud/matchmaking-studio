import { createClient as createSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { headers } from 'next/headers'

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024
const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif', 'pdf', 'doc', 'docx']

function json(message: string, status: number) {
  return Response.json({ success: false, message }, { status })
}

function sanitizeFileName(fileName: string) {
  const [baseName = 'file', extension = 'bin'] = fileName.split(/\.(?=[^.]+$)/)
  const safeBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'file'
  const safeExtension = extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 8) || 'bin'
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
  const kind = String(formData.get('kind') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim() || null
  const file = formData.get('file')

  if (!profileId) return json('缺少客户 ID', 400)

  const validKinds = ['document', 'screenshot', 'voice_note', 'other']
  if (!validKinds.includes(kind)) return json('材料类型无效', 400)

  if (!(file instanceof File)) return json('未读取到文件', 400)
  if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) return json('文件大小需要控制在 20MB 以内', 400)
  if (!isSupportedFile(file)) return json('不支持的文件格式', 400)

  // 权限检查
  const [{ data: roleData }, { data: profile }] = await Promise.all([
    withSupabaseRetry(
      () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      { label: 'material upload role query' }
    ),
    withSupabaseRetry(
      () => serviceRoleClient.from('profiles').select('id, matchmaker_id').eq('id', profileId).maybeSingle(),
      { label: 'material upload profile query' }
    ),
  ])

  if (!profile) return json('客户不存在', 404)
  const isAdmin = roleData?.role === 'admin'
  if (!isAdmin && profile.matchmaker_id !== user.id) return json('无权操作该客户', 403)

  // 上传到 supplemental-materials bucket
  const safeFileName = sanitizeFileName(file.name)
  const objectPath = `${user.id}/${profileId}/${kind}/${Date.now()}-${safeFileName}`
  const fileBuffer = await file.arrayBuffer()

  const { error: uploadError } = await withSupabaseRetry(
    () => serviceRoleClient.storage.from('supplemental-materials').upload(objectPath, fileBuffer, {
      contentType: file.type || undefined,
      upsert: false,
    }),
    { label: 'supplemental material upload' }
  )

  if (uploadError) return json(uploadError.message, 500)

  const { data: { publicUrl } } = serviceRoleClient.storage
    .from('supplemental-materials')
    .getPublicUrl(objectPath)

  // 写入 supplemental_materials 表
  const { data: inserted, error: insertError } = await withSupabaseRetry(
    () => serviceRoleClient.from('supplemental_materials').insert({
      profile_id: profileId,
      kind: kind as any,
      url: publicUrl,
      title,
      source: 'matchmaker',
      extraction_status: 'pending',
    }).select('id').single(),
    { label: 'supplemental material record insert' }
  )

  if (insertError) return json(insertError.message, 500)

  // 异步触发 AI 提取（不阻塞上传响应）
  const materialId = inserted?.id
  if (materialId) {
    const fileExtension = objectPath.split('.').pop() ?? 'jpg'
    const headersList = await headers()
    const host = headersList.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const extractUrl = `${protocol}://${host}/api/supplemental-materials/extract`

    fetch(extractUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.INTERNAL_API_SECRET
          ? { 'x-internal-secret': process.env.INTERNAL_API_SECRET }
          : {}),
      },
      body: JSON.stringify({ materialId, fileUrl: publicUrl, fileExtension, kind }),
    }).catch(() => {})
  }

  return Response.json({ success: true, fileUrl: publicUrl })
}
