/**
 * GET /api/certification-materials/view?certId=xxx&index=0
 *
 * 生成认证材料的临时访问 URL（signed URL，有效期 60 分钟），
 * 并以 302 重定向的方式让浏览器直接访问文件。
 *
 * 之所以用重定向而非返回 URL 字符串，是因为图片/PDF 直接在
 * 新标签页打开体验更好，也不需要前端额外处理。
 */

import { createClient as createSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { extractBucketObjectPath } from '@/lib/storage/object-path'

const SIGNED_URL_EXPIRES_IN = 60 * 60 // 1 小时

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const certId = searchParams.get('certId')?.trim()
  const indexStr = searchParams.get('index') ?? '0'
  const index = Math.max(0, parseInt(indexStr, 10) || 0)

  if (!certId) {
    return new Response('缺少 certId 参数', { status: 400 })
  }

  // 鉴权
  const supabase = await createSupabaseClient()
  const serviceRoleClient = createServiceRoleClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('未登录', { status: 401 })

  // 取认证记录
  const { data: cert, error: certError } = await withSupabaseRetry(
    () => serviceRoleClient
      .from('profile_certifications')
      .select('id, profile_id, material_refs')
      .eq('id', certId)
      .single(),
    { label: 'cert view: fetch cert' }
  )

  if (certError || !cert) {
    return new Response('认证记录不存在', { status: 404 })
  }

  // 权限检查：必须是该客户的红娘或管理员
  const [{ data: roleData }, { data: profile }] = await Promise.all([
    withSupabaseRetry(
      () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      { label: 'cert view: role query' }
    ),
    withSupabaseRetry(
      () => serviceRoleClient
        .from('profiles')
        .select('id, matchmaker_id')
        .eq('id', cert.profile_id)
        .single(),
      { label: 'cert view: profile query' }
    ),
  ])

  if (!profile) return new Response('客户不存在', { status: 404 })
  const isAdmin = roleData?.role === 'admin'
  if (!isAdmin && profile.matchmaker_id !== user.id) {
    return new Response('无权访问', { status: 403 })
  }

  // 取指定索引的文件 URL
  const refs: string[] = cert.material_refs ?? []
  if (refs.length === 0 || index >= refs.length) {
    return new Response('文件不存在', { status: 404 })
  }

  const fileUrl = refs[index]

  // 从完整 URL 中提取 object path
  const objectPath = extractBucketObjectPath(fileUrl, 'certification-materials')
  if (!objectPath) {
    return new Response('无法解析文件路径', { status: 500 })
  }

  // 生成 signed URL
  const { data: signedData, error: signError } = await serviceRoleClient.storage
    .from('certification-materials')
    .createSignedUrl(objectPath, SIGNED_URL_EXPIRES_IN)

  if (signError || !signedData?.signedUrl) {
    return new Response('生成访问链接失败', { status: 500 })
  }

  // 302 重定向到 signed URL
  return Response.redirect(signedData.signedUrl, 302)
}
