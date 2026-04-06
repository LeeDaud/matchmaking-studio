/**
 * POST /api/certification-materials/cancel-extract
 *
 * 取消正在进行的 AI 提取。
 * 在 review_notes 写入 extraction_cancelled 标记，
 * extract route 在执行前会检查此标记并提前退出。
 *
 * Body: { certId }
 */

import { createClient as createSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withSupabaseRetry } from '@/lib/supabase/retry'

export async function POST(request: Request) {
  const supabase = await createSupabaseClient()
  const serviceRoleClient = createServiceRoleClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ success: false, message: '未登录' }, { status: 401 })

  let body: { certId?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, message: '无效请求体' }, { status: 400 })
  }

  const { certId } = body
  if (!certId) return Response.json({ success: false, message: '缺少 certId' }, { status: 400 })

  // 权限检查
  const { data: cert } = await withSupabaseRetry(
    () => serviceRoleClient
      .from('profile_certifications')
      .select('id, profile_id')
      .eq('id', certId)
      .single(),
    { label: 'cancel extract: fetch cert' }
  )

  if (!cert) return Response.json({ success: false, message: '记录不存在' }, { status: 404 })

  const [{ data: roleData }, { data: profile }] = await Promise.all([
    withSupabaseRetry(
      () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      { label: 'cancel extract: role query' }
    ),
    withSupabaseRetry(
      () => serviceRoleClient.from('profiles').select('id, matchmaker_id').eq('id', cert.profile_id).single(),
      { label: 'cancel extract: profile query' }
    ),
  ])

  if (!profile) return Response.json({ success: false, message: '客户不存在' }, { status: 404 })
  const isAdmin = roleData?.role === 'admin'
  if (!isAdmin && profile.matchmaker_id !== user.id) {
    return Response.json({ success: false, message: '无权操作' }, { status: 403 })
  }

  // 写入取消标记
  await withSupabaseRetry(
    () => serviceRoleClient
      .from('profile_certifications')
      .update({
        review_notes: JSON.stringify({
          extraction_cancelled: true,
          cancelled_at: new Date().toISOString(),
        }),
      })
      .eq('id', certId),
    { label: 'cancel extract: write cancel flag' }
  )

  return Response.json({ success: true })
}
