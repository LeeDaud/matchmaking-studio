import { createClient as createSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withSupabaseRetry } from '@/lib/supabase/retry'

function json(message: string, status: number) {
  return Response.json({ success: false, message }, { status })
}

export async function POST(request: Request) {
  const supabase = await createSupabaseClient()
  const serviceRoleClient = createServiceRoleClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return json('未登录', 401)

  const { profileId, photoUrl } = await request.json()
  if (!profileId || !photoUrl) return json('参数不完整', 400)

  const [{ data: roleData }, { data: profile }] = await Promise.all([
    withSupabaseRetry(
      () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
      { label: 'set avatar role query' }
    ),
    withSupabaseRetry(
      () => serviceRoleClient
        .from('profiles')
        .select('id, matchmaker_id')
        .eq('id', profileId)
        .maybeSingle(),
      { label: 'set avatar profile query' }
    ),
  ])

  if (!profile) return json('客户不存在', 404)
  const isAdmin = roleData?.role === 'admin'
  if (!isAdmin && profile.matchmaker_id !== user.id) return json('无权操作', 403)

  const { error } = await withSupabaseRetry(
    () => serviceRoleClient.from('profiles').update({ avatar_url: photoUrl }).eq('id', profileId),
    { label: 'set avatar update' }
  )
  if (error) return json(error.message, 500)

  return Response.json({ success: true })
}
