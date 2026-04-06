/**
 * POST /api/supplemental-materials/delete
 *
 * 删除一条补充材料记录（Storage 对象 + DB 行）。
 *
 * Body: { materialId }
 */

import { createClient as createSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { extractBucketObjectPath } from '@/lib/storage/object-path'

export async function POST(request: Request) {
  const supabase = await createSupabaseClient()
  const serviceRoleClient = createServiceRoleClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ success: false, message: '未登录' }, { status: 401 })

  let body: { materialId?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, message: '无效请求体' }, { status: 400 })
  }

  const { materialId } = body
  if (!materialId) return Response.json({ success: false, message: '缺少 materialId' }, { status: 400 })

  // 取材料记录
  const { data: material } = await withSupabaseRetry(
    () => serviceRoleClient
      .from('supplemental_materials')
      .select('id, profile_id, url')
      .eq('id', materialId)
      .single(),
    { label: 'supplemental delete: fetch material' }
  )

  if (!material) return Response.json({ success: false, message: '记录不存在' }, { status: 404 })

  // 权限检查
  const [{ data: roleData }, { data: profile }] = await Promise.all([
    withSupabaseRetry(
      () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      { label: 'supplemental delete: role query' }
    ),
    withSupabaseRetry(
      () => serviceRoleClient.from('profiles').select('id, matchmaker_id').eq('id', material.profile_id).single(),
      { label: 'supplemental delete: profile query' }
    ),
  ])

  if (!profile) return Response.json({ success: false, message: '客户不存在' }, { status: 404 })
  const isAdmin = roleData?.role === 'admin'
  if (!isAdmin && profile.matchmaker_id !== user.id) {
    return Response.json({ success: false, message: '无权操作' }, { status: 403 })
  }

  // 从 Storage 删除对象（失败不阻断 DB 删除）
  const objectPath = extractBucketObjectPath(material.url, 'supplemental-materials')
  if (objectPath) {
    await serviceRoleClient.storage
      .from('supplemental-materials')
      .remove([objectPath])
      .catch(() => {})
  }

  // 删除 DB 行
  await withSupabaseRetry(
    () => serviceRoleClient.from('supplemental_materials').delete().eq('id', materialId),
    { label: 'supplemental delete: delete row' }
  )

  return Response.json({ success: true })
}
