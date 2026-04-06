/**
 * POST /api/certification-materials/delete
 *
 * 删除 profile_certifications.material_refs[] 中的某一个文件。
 * 同时从 Storage 删除对应对象。
 * 若删除后 material_refs 为空，则将 status 重置为 not_submitted 并清空 review_notes。
 *
 * Body: { certId, index }  — index 是 material_refs 数组中的位置
 */

import { createClient as createSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { extractBucketObjectPath } from '@/lib/storage/object-path'

export async function POST(request: Request) {
  const supabase = await createSupabaseClient()
  const serviceRoleClient = createServiceRoleClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ success: false, message: '未登录' }, { status: 401 })

  let body: { certId?: string; index?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, message: '无效请求体' }, { status: 400 })
  }

  const { certId, index } = body
  if (!certId || index === undefined || index === null) {
    return Response.json({ success: false, message: '缺少 certId 或 index' }, { status: 400 })
  }

  // 取认证记录
  const { data: cert } = await withSupabaseRetry(
    () => serviceRoleClient
      .from('profile_certifications')
      .select('id, profile_id, material_refs, status')
      .eq('id', certId)
      .single(),
    { label: 'cert delete: fetch cert' }
  )

  if (!cert) return Response.json({ success: false, message: '记录不存在' }, { status: 404 })

  // 权限检查
  const [{ data: roleData }, { data: profile }] = await Promise.all([
    withSupabaseRetry(
      () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      { label: 'cert delete: role query' }
    ),
    withSupabaseRetry(
      () => serviceRoleClient.from('profiles').select('id, matchmaker_id').eq('id', cert.profile_id).single(),
      { label: 'cert delete: profile query' }
    ),
  ])

  if (!profile) return Response.json({ success: false, message: '客户不存在' }, { status: 404 })
  const isAdmin = roleData?.role === 'admin'
  if (!isAdmin && profile.matchmaker_id !== user.id) {
    return Response.json({ success: false, message: '无权操作' }, { status: 403 })
  }

  const refs: string[] = cert.material_refs ?? []
  if (index < 0 || index >= refs.length) {
    return Response.json({ success: false, message: '索引越界' }, { status: 400 })
  }

  const urlToDelete = refs[index]
  const newRefs = refs.filter((_, i) => i !== index)

  // 从 Storage 删除对象（失败不阻断 DB 更新）
  const objectPath = extractBucketObjectPath(urlToDelete, 'certification-materials')
  if (objectPath) {
    await serviceRoleClient.storage
      .from('certification-materials')
      .remove([objectPath])
      .catch(() => {})
  }

  // 更新 DB
  const isEmpty = newRefs.length === 0
  await withSupabaseRetry(
    () => serviceRoleClient
      .from('profile_certifications')
      .update({
        material_refs: newRefs,
        ...(isEmpty
          ? { status: 'not_submitted', review_notes: null, submitted_at: null }
          : { review_notes: null }), // 删除任意文件都清空旧提取结果
      })
      .eq('id', certId),
    { label: 'cert delete: update refs' }
  )

  return Response.json({ success: true, remaining: newRefs.length })
}
