import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ClientTabs } from '@/components/client/client-tabs'
import Link from 'next/link'
import { ArrowUpRight, ChevronLeft, MapPin, Mic, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WorkspaceDetailTemplate } from '@/components/layouts/workspace-detail-template'
import { requireSessionUser } from '@/lib/auth/session-user'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { GENDER_LABELS, STATUS_LABELS } from '@/types/app'
import { DeleteClientButton } from '@/components/client/delete-client-button'
import { ProfileAvatar } from '@/components/client/profile-avatar'
import { cn } from '@/lib/utils'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireSessionUser()
  const supabase = await createClient()
  const [
    profileResult,
    intentionResult,
    traitProfileResult,
    conversationsResult,
    matchesResult,
    followupTasksResult,
    certificationsResult,
    supplementalMaterialsResult,
  ] = await Promise.all([
    withSupabaseRetry(() => supabase.from('profiles').select('*').eq('id', id).single(), { label: 'client detail profile query' }),
    withSupabaseRetry(() => supabase.from('intentions').select('*').eq('profile_id', id).single(), { label: 'client detail intention query' }),
    withSupabaseRetry(() => supabase.from('trait_profiles').select('*').eq('profile_id', id).maybeSingle(), { label: 'client detail trait profile query' }),
    withSupabaseRetry(() => supabase.from('conversations').select('*').eq('profile_id', id).order('created_at', { ascending: false }), { label: 'client detail conversations query' }),
    withSupabaseRetry(
      () => supabase
        .from('matches')
        .select('*, male_profile:profiles!matches_male_profile_id_fkey(*), female_profile:profiles!matches_female_profile_id_fkey(*)')
        .or(`male_profile_id.eq.${id},female_profile_id.eq.${id}`)
        .order('match_score', { ascending: false }),
      { label: 'client detail matches query' }
    ),
    withSupabaseRetry(() => supabase.from('followup_tasks').select('*').eq('profile_id', id).order('updated_at', { ascending: false }), { label: 'client detail followup tasks query' }),
    withSupabaseRetry(() => supabase.from('profile_certifications').select('*').eq('profile_id', id).order('created_at'), { label: 'client detail certifications query' }),
    withSupabaseRetry(() => supabase.from('supplemental_materials').select('*').eq('profile_id', id).order('uploaded_at', { ascending: false }), { label: 'client detail supplemental materials query' }),
  ])

  if (profileResult.error) {
    throw new Error(`加载客户详情失败: ${profileResult.error.message}`)
  }

  const { data: profile } = profileResult
  const { data: intention } = intentionResult
  const { data: traitProfile } = traitProfileResult
  const { data: conversations } = conversationsResult
  const { data: matches } = matchesResult
  const { data: followupTasks } = followupTasksResult
  const { data: certifications } = certificationsResult
  const { data: supplementalMaterials } = supplementalMaterialsResult

  if (!profile) notFound()

  const conversationRows = conversations ?? []
  const matchRows = ((matches as any) ?? []) as Array<{ recommendation_type: string }>
  const followupTaskRows = followupTasks ?? []

  const latestConversation = conversationRows[0] ?? null
  const pendingMatchCount = matchRows.filter((match) => match.recommendation_type === 'pending_confirmation').length
  const confirmedMatchCount = matchRows.filter((match) => match.recommendation_type === 'confirmed').length
  const openTaskCount = followupTaskRows.filter((task) => task.status === 'open' || task.status === 'in_progress').length
  const latestMissingCount = latestConversation?.missing_fields?.length ?? 0
  const latestQuestionCount = latestConversation?.suggested_questions?.length ?? 0

  return (
    <WorkspaceDetailTemplate
      backHref="/matchmaker/clients"
      backLabel="返回客户列表"
      hero={
        <section className="overflow-hidden rounded-[34px] border border-border/80 bg-[radial-gradient(circle_at_top_left,rgba(11,99,246,0.08),transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.98),rgba(247,250,255,0.96)_48%,rgba(244,247,252,0.94))] shadow-[0_30px_70px_-50px_rgba(15,23,42,0.18)] dark:border-white/8 dark:bg-[radial-gradient(circle_at_top_left,rgba(82,145,243,0.18),transparent_34%),linear-gradient(145deg,rgba(16,24,36,0.98),rgba(10,15,23,0.98)_54%,rgba(9,13,21,0.96))] dark:shadow-[0_38px_90px_-52px_rgba(0,0,0,0.72)]">
          <div className="flex flex-wrap items-start justify-between gap-5 px-6 pb-6 pt-7 lg:px-8">
            <div className="flex max-w-3xl items-start gap-4">
              <ProfileAvatar
                name={profile.name}
                avatarUrl={profile.avatar_url}
                className="h-24 w-24 shrink-0 overflow-hidden rounded-[30px] border border-white/90 bg-white shadow-[0_20px_40px_-28px_rgba(15,23,42,0.2)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(17,24,37,0.98),rgba(10,15,22,0.98))] dark:shadow-[0_24px_54px_-30px_rgba(0,0,0,0.62)]"
                imageClassName="h-full w-full object-cover"
                iconClassName="h-8 w-8 text-primary/70"
                fallbackLabel="未上传头像"
              />

              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge className="border border-border/80 bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground/58">
                    {GENDER_LABELS[profile.gender]}
                  </Badge>
                  <Badge className="border border-border/80 bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground/58">
                    {STATUS_LABELS[profile.status]}
                  </Badge>
                  {intention?.relationship_mode && (
                    <Badge className="border border-primary/10 bg-primary/8 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-primary dark:border-primary/18 dark:bg-primary/14 dark:text-primary">
                      {intention.relationship_mode === 'marriage_standard' ? '标准婚恋' : intention.relationship_mode === 'compensated_dating' ? '恋爱' : '生育资产型'}
                    </Badge>
                  )}
                </div>
                <h2 className="font-heading text-4xl leading-tight text-foreground">{profile.name}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground dark:text-foreground/64">
                  {profile.ai_summary || '当前客户已进入 AI-first 工作流，可通过最新录音、待确认字段和下一轮补问持续推进。'}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-foreground/80">
                  {profile.age ? <span className="rounded-full border border-border/80 bg-white/75 px-3 py-1.5 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground/78">{profile.age} 岁</span> : null}
                  {profile.city ? <span className="rounded-full border border-border/80 bg-white/75 px-3 py-1.5 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground/78">{profile.city}</span> : null}
                  {profile.occupation ? <span className="rounded-full border border-border/80 bg-white/75 px-3 py-1.5 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground/78">{profile.occupation}</span> : null}
                  {profile.annual_income ? <span className="rounded-full border border-border/80 bg-white/75 px-3 py-1.5 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground/78">约 {profile.annual_income} 万 / 年</span> : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={`/matchmaker/clients/${id}/upload`}>
                <Button className="h-11 rounded-[18px] px-4">
                  <Mic className="mr-2 h-4 w-4" />
                  上传新录音
                </Button>
              </Link>
              <Link href="/matchmaker/matches">
                <Button variant="outline" className="h-11 rounded-[18px] px-4">
                  去匹配工作台
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <DeleteClientButton profileId={id} profileName={profile.name} />
            </div>
          </div>

          <div className="grid gap-px border-t border-border/80 bg-border/80 lg:grid-cols-4">
            <HeroMetric label="已确认候选" value={String(confirmedMatchCount)} helper="当前可直接推进的优先候选" />
            <HeroMetric label="待确认候选" value={String(pendingMatchCount)} helper="需要补问后再推进的候选" />
            <HeroMetric label="开放任务" value={String(openTaskCount)} helper="待补问、待确认与跟进事项" />
            <HeroMetric label="最近缺口" value={String(latestMissingCount + latestQuestionCount)} helper="最新录音发现的缺口与补问" />
          </div>
        </section>
      }
      main={
        <div className="min-w-0 rounded-[30px] border border-border/80 bg-white/78 p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.18)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(13,18,27,0.92),rgba(10,14,21,0.94))] dark:shadow-[0_32px_80px_-48px_rgba(0,0,0,0.68)] md:p-6">
          <ClientTabs
            profile={profile}
            intention={intention}
            traitProfile={traitProfile}
            conversations={conversationRows}
            matches={(matches as any) ?? []}
            followupTasks={followupTaskRows}
            certifications={(certifications as any) ?? []}
            supplementalMaterials={(supplementalMaterials as any) ?? []}
          />
        </div>
      }
      aside={
        <>
          <SignalPanel title="当前推进脉络" icon={<Sparkles className="h-4 w-4 text-primary" />}>
            <SignalRow label="最近录音" value={latestConversation ? new Date(latestConversation.created_at).toLocaleString('zh-CN') : '暂无'} />
            <SignalRow label="最近状态" value={latestConversation ? latestConversation.status : '未开始'} />
            <SignalRow label="未完成任务" value={`${openTaskCount} 项`} />
          </SignalPanel>

          <SignalPanel title="最近沟通重点" icon={<MapPin className="h-4 w-4 text-primary" />}>
            <p className="text-sm leading-7 text-muted-foreground">
              {latestConversation?.extraction_notes || '上传最新录音后，这里会自动汇总 AI 摘要、关键缺口与下一步建议。'}
            </p>
          </SignalPanel>
        </>
      }
    />
  )
}

function HeroMetric({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="bg-white/82 px-5 py-5 dark:bg-[linear-gradient(180deg,rgba(16,23,35,0.94),rgba(10,15,23,0.96))]">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground dark:text-foreground/50">{label}</div>
      <div className="mt-2 font-heading text-3xl text-foreground dark:text-foreground">{value}</div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground dark:text-foreground/62">{helper}</p>
    </div>
  )
}

function SignalPanel({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[28px] border border-border/80 bg-white/80 p-5 shadow-[0_20px_44px_-34px_rgba(15,23,42,0.16)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(14,19,29,0.92),rgba(10,15,22,0.94))] dark:shadow-[0_28px_68px_-42px_rgba(0,0,0,0.64)]">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground dark:text-foreground">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </section>
  )
}

function SignalRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/80 py-3 text-sm last:border-b-0 last:pb-0 first:pt-0 dark:border-white/8">
      <span className="text-muted-foreground dark:text-foreground/58">{label}</span>
      <span className="text-right font-medium text-foreground dark:text-foreground">{value}</span>
    </div>
  )
}
