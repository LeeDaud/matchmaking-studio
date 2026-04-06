'use client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Profile, Intention, Conversation, Match, TraitProfile, FollowupTask, ProfileCertification } from '@/types/database'
import { ProfileInfoTab } from './profile-info-tab'
import { MatchRecommendTab } from './match-recommend-tab'
import { ConversationsTab } from './conversations-tab'
import { FollowupTab } from './followup-tab'
import { CertificationPanel } from './certification-panel'
import { DataImportPanel } from './data-import-panel'

interface ClientTabsProps {
  profile: Profile
  intention: Intention | null
  traitProfile: TraitProfile | null
  conversations: Conversation[]
  matches: (Match & { male_profile: Profile; female_profile: Profile })[]
  followupTasks: FollowupTask[]
  certifications: ProfileCertification[]
}

export function ClientTabs({ profile, intention, traitProfile, conversations, matches, followupTasks, certifications }: ClientTabsProps) {
  const pendingMatchCount = matches.filter((match) => match.recommendation_type === 'pending_confirmation').length
  const openTaskCount = followupTasks.filter((task) => task.status === 'open' || task.status === 'in_progress').length
  const pendingCertCount = certifications.filter((c) => c.status === 'pending_review').length
  const verifiedCertCount = certifications.filter((c) => c.status === 'verified').length

  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="mb-6 grid w-full grid-cols-3 rounded-[24px] dark:border-white/8 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] lg:grid-cols-5">
        <TabsTrigger value="info" className="rounded-[18px]">
          基本信息
        </TabsTrigger>
        <TabsTrigger value="certification" className="rounded-[18px]">
          认证与资料
          {(pendingCertCount > 0 || verifiedCertCount > 0) && (
            <span className="ml-1.5 min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-xs text-white dark:bg-primary dark:text-primary-foreground">
              {verifiedCertCount > 0 ? `${verifiedCertCount}✓` : pendingCertCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="matches" className="rounded-[18px]">
          匹配推荐
          {pendingMatchCount > 0 && (
            <span className="ml-1.5 min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-xs text-white dark:bg-primary dark:text-primary-foreground">
              {pendingMatchCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="conversations" className="rounded-[18px]">
          录音记录
        </TabsTrigger>
        <TabsTrigger value="followup" className="rounded-[18px]">
          跟进记录
          {openTaskCount > 0 && (
            <span className="ml-1.5 min-w-5 rounded-full bg-primary/85 px-1.5 py-0.5 text-xs text-white dark:bg-primary dark:text-primary-foreground">
              {openTaskCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <ProfileInfoTab profile={profile} intention={intention} traitProfile={traitProfile} />
      </TabsContent>
      <TabsContent value="certification">
        <div className="space-y-6">
          <CertificationPanel profileId={profile.id} certifications={certifications} />
          <DataImportPanel profileId={profile.id} />
        </div>
      </TabsContent>
      <TabsContent value="matches">
        <MatchRecommendTab matches={matches} profile={profile} />
      </TabsContent>
      <TabsContent value="conversations">
        <ConversationsTab conversations={conversations} profileId={profile.id} />
      </TabsContent>
      <TabsContent value="followup">
        <FollowupTab matches={matches} tasks={followupTasks} />
      </TabsContent>
    </Tabs>
  )
}
