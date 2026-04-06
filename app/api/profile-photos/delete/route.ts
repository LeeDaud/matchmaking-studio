import { createClient as createSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { extractBucketObjectPath } from '@/lib/storage/object-path'

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
      { label: 'photo delete role query' }
    ),
    withSupabaseRetry(
      () => serviceRoleClient
        .from('profiles')
        .select('id, matchmaker_id, lifestyle_photo_urls')
        .eq('id', profileId)
        .maybeSingle(),
      { label: 'photo delete profile query' }
    ),
  ])

  if (!profile) return json('客户不存在', 404)
  const isAdmin = roleData?.role === 'admin'
  if (!isAdmin && profile.matchmaker_id !== user.id) return json('无权操作', 403)

  const nextUrls = (profile.lifestyle_photo_urls ?? []).filter((u: string) => u !== photoUrl)

  const { error: updateError } = await withSupabaseRetry(
    () => serviceRoleClient.from('profiles').update({ lifestyle_photo_urls: nextUrls }).eq('id', profileId),
    { label: 'photo delete update' }
  )
  if (updateError) return json(updateError.message, 500)

  // 尝试删除存储文件
  const objectPath = extractBucketObjectPath(photoUrl, 'profile-photos')
  if (objectPath) {
    await serviceRoleClient.storage.from('profile-photos').remove([objectPath])
  }

  return Response.json({ success: true })
}
