'use server'

import { createClient as createSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import type { CertificationStatus, CertificationType } from '@/types/database'

export async function getCertifications(profileId: string) {
  const supabase = await createSupabaseClient()
  const { data, error } = await withSupabaseRetry(
    () => supabase
      .from('profile_certifications')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at'),
    { label: 'get certifications' }
  )
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function reviewCertification(
  certId: string,
  action: 'verify' | 'reject',
  notes?: string,
  rejectionReason?: string,
) {
  const supabase = await createSupabaseClient()
  const serviceRoleClient = createServiceRoleClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  // 检查管理员权限
  const { data: roleData } = await withSupabaseRetry(
    () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
    { label: 'review cert role check' }
  )
  if (roleData?.role !== 'admin') throw new Error('仅管理员可审核认证')

  const { data: cert } = await withSupabaseRetry(
    () => serviceRoleClient
      .from('profile_certifications')
      .select('id, profile_id, type, status')
      .eq('id', certId)
      .maybeSingle(),
    { label: 'review cert lookup' }
  )
  if (!cert) throw new Error('认证记录不存在')
  if (cert.status !== 'pending_review') throw new Error('该认证不在待审核状态')

  const now = new Date().toISOString()

  if (action === 'verify') {
    const update: Record<string, any> = {
      status: 'verified' as CertificationStatus,
      reviewed_at: now,
      reviewed_by: user.id,
      review_notes: notes ?? null,
      rejection_reason: null,
    }
    // 健康认证设置 6 个月有效期
    if (cert.type === 'health') {
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + 6)
      update.expires_at = expiresAt.toISOString()
    }
    const { error } = await withSupabaseRetry(
      () => serviceRoleClient.from('profile_certifications').update(update).eq('id', certId),
      { label: 'verify cert' }
    )
    if (error) throw new Error(error.message)
  } else {
    if (!rejectionReason?.trim()) throw new Error('驳回时必须填写驳回原因')
    const { error } = await withSupabaseRetry(
      () => serviceRoleClient.from('profile_certifications').update({
        status: 'rejected' as CertificationStatus,
        reviewed_at: now,
        reviewed_by: user.id,
        review_notes: notes ?? null,
        rejection_reason: rejectionReason.trim(),
      }).eq('id', certId),
      { label: 'reject cert' }
    )
    if (error) throw new Error(error.message)
  }

  revalidatePath(`/matchmaker/clients/${cert.profile_id}`)
  revalidatePath('/admin/certifications')
}

export async function revokeCertification(certId: string, reason: string) {
  const supabase = await createSupabaseClient()
  const serviceRoleClient = createServiceRoleClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data: roleData } = await withSupabaseRetry(
    () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
    { label: 'revoke cert role check' }
  )
  if (roleData?.role !== 'admin') throw new Error('仅管理员可撤销认证')
  if (!reason?.trim()) throw new Error('撤销认证必须填写原因')

  const { data: cert } = await withSupabaseRetry(
    () => serviceRoleClient.from('profile_certifications').select('id, profile_id, status').eq('id', certId).maybeSingle(),
    { label: 'revoke cert lookup' }
  )
  if (!cert) throw new Error('认证记录不存在')
  if (cert.status !== 'verified') throw new Error('只能撤销已通过的认证')

  const { error } = await withSupabaseRetry(
    () => serviceRoleClient.from('profile_certifications').update({
      status: 'not_submitted' as CertificationStatus,
      material_refs: [],
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      review_notes: `撤销原因：${reason.trim()}`,
      rejection_reason: null,
      expires_at: null,
    }).eq('id', certId),
    { label: 'revoke cert' }
  )
  if (error) throw new Error(error.message)

  revalidatePath(`/matchmaker/clients/${cert.profile_id}`)
}

/** 获取所有待审核认证（管理员用） */
export async function getPendingCertifications() {
  const supabase = await createSupabaseClient()
  const serviceRoleClient = createServiceRoleClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登录')

  const { data: roleData } = await withSupabaseRetry(
    () => supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle(),
    { label: 'pending certs role check' }
  )
  if (roleData?.role !== 'admin') throw new Error('仅管理员可查看待审核列表')

  const { data, error } = await withSupabaseRetry(
    () => serviceRoleClient
      .from('profile_certifications')
      .select('*, profiles!inner(id, name, full_name, display_name)')
      .eq('status', 'pending_review')
      .order('submitted_at', { ascending: true }),
    { label: 'get pending certs' }
  )
  if (error) throw new Error(error.message)
  return data ?? []
}
