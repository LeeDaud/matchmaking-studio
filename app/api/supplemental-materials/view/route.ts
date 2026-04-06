/**
 * GET /api/supplemental-materials/view?materialId=xxx
 *
 * 生成补充材料的临时访问 URL（signed URL，有效期 1 小时），
 * 302 重定向到文件，让浏览器直接打开图片/PDF。
 */

import { createClient as createSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { extractBucketObjectPath } from '@/lib/storage/object-path'

const SIGNED_URL_EXPIRES_IN = 60 * 60 // 1 小时

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const materialId = searchParams.get('materialId')?.trim()

  if (!materialId) {
    return new Response('缺少 materialId 参数', { status: 400 })
  }

  const supabase = await createSupabaseClient()
  const serviceRoleClient = createServiceRoleClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('未登录', { status: 401 })

  // 取材料记录
  const { data: material, error } = await withSupabaseRetry(
    () => serviceRoleClient
      .from('supplemental_materials')
      .select('id, profile_id, url, kind, title')
      .eq('id', materialId)
      .single(),
    { label: 'supplemental view: fetch material' }
  )

  if (error || !material) {
    return new Response('材料记录不存在', { status: 404 })
  }

  // 权限：红娘本人或管理员
  const [{ data: roleData }, { data: profile }] = await Promise.all([
    withSupabaseRetry(
      () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      { label: 'supplemental view: role query' }
    ),
    withSupabaseRetry(
      () => serviceRoleClient
        .from('profiles')
        .select('id, matchmaker_id')
        .eq('id', material.profile_id)
        .single(),
      { label: 'supplemental view: profile query' }
    ),
  ])

  if (!profile) return new Response('客户不存在', { status: 404 })
  const isAdmin = roleData?.role === 'admin'
  if (!isAdmin && profile.matchmaker_id !== user.id) {
    return new Response('无权访问', { status: 403 })
  }

  // 从完整 URL 提取 object path
  const objectPath = extractBucketObjectPath(material.url, 'supplemental-materials')
  if (!objectPath) {
    return new Response('无法解析文件路径', { status: 500 })
  }

  // 生成 signed URL
  const { data: signedData, error: signError } = await serviceRoleClient.storage
    .from('supplemental-materials')
    .createSignedUrl(objectPath, SIGNED_URL_EXPIRES_IN)

  if (signError || !signedData?.signedUrl) {
    return new Response('生成访问链接失败', { status: 500 })
  }

  return Response.redirect(signedData.signedUrl, 302)
}
