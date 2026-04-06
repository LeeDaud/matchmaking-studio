import {
  Database,
  GenderType,
  ProfileStatus,
  EducationLevel,
  EducationLevelV2,
  MaritalHistoryType,
  HasChildrenType,
  CustodyStatusType,
  HasAssetType,
  LifestyleYnType,
  FrequencyType,
  FamilyAssetBandType,
  IncomeSourceCategory,
  UrgencyLevelType,
  ParentsMaritalStatusType,
  FinancialTiesType,
  LifecycleStatus,
  PrimaryIntent,
  RelationshipMode,
  TriState,
  MatchStatus,
  RecommendationType,
  ConversationStatus,
  ReminderType,
  ImportanceLevel,
  CertificationType,
  CertificationStatus,
} from './database'

export type ProfileCertification = Database['public']['Tables']['profile_certifications']['Row']
export type SupplementalMaterial = Database['public']['Tables']['supplemental_materials']['Row']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Intention = Database['public']['Tables']['intentions']['Row']
export type TraitProfile = Database['public']['Tables']['trait_profiles']['Row']
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type FollowupTask = Database['public']['Tables']['followup_tasks']['Row']
export type Reminder = Database['public']['Tables']['reminders']['Row']
export type UserRole = Database['public']['Tables']['user_roles']['Row']

export type ProfileWithDetail = Profile & {
  intentions: Intention | null
  trait_profile: TraitProfile | null
}

export type MatchWithProfiles = Match & {
  male_profile: Profile
  female_profile: Profile
}

export type ScoreBreakdown = {
  intent_stage: number
  city_mobility: number
  marriage_children: number
  economics: number
  lifestyle: number
  relationship_style: number
  sensitive_mode: number
  hard_conflicts: string[]
  pending_fields: string[]
  directional_notes: string[]
}

export type ScoreDimensionKey = keyof Omit<
  ScoreBreakdown,
  'hard_conflicts' | 'pending_fields' | 'directional_notes'
>

export const SCORE_DIMENSION_META = [
  { key: 'intent_stage', label: '意图与阶段', max: 15 },
  { key: 'city_mobility', label: '城市与流动', max: 10 },
  { key: 'marriage_children', label: '婚育边界', max: 15 },
  { key: 'economics', label: '经济与资源', max: 10 },
  { key: 'lifestyle', label: '生活方式', max: 15 },
  { key: 'relationship_style', label: '相处方式', max: 10 },
  { key: 'sensitive_mode', label: '敏感模式', max: 10 },
] as const

export const GENDER_LABELS: Record<GenderType, string> = {
  male: '男方',
  female: '女方',
}

export const STATUS_LABELS: Record<ProfileStatus, string> = {
  active:          '活跃 · 积极寻找中',
  paused:          '暂停 · 暂时搁置',
  matched_dating:  '已匹配（恋爱中）',
  matched_married: '已匹配（已婚）',
  withdrawn:       '退档',
}

export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  high_school: '高中',
  associate: '专科',
  bachelor: '本科',
  master: '硕士',
  phd: '博士',
  other: '其他',
}

export const INTENT_LABELS: Record<PrimaryIntent, string> = {
  marriage: '结婚',
  dating: '恋爱',
  fertility: '生育目标',
}

export const RELATIONSHIP_MODE_LABELS: Record<RelationshipMode, string> = {
  marriage_standard: '奔着结婚去的标准婚恋',
  compensated_dating: '恋爱',
  fertility_asset_arrangement: '生育资产安排型',
}

export const TRI_STATE_LABELS: Record<TriState, string> = {
  yes: '接受',
  no: '不接受',
  unknown: '待确认',
}

export const IMPORTANCE_LEVEL_LABELS: Record<ImportanceLevel, string> = {
  hard: '硬性',
  important: '重要',
  normal: '一般',
  flexible: '无所谓',
}

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  pending: '待处理',
  reviewing: '评估中',
  contacted_male: '已联系男方',
  contacted_female: '已联系女方',
  both_agreed: '双方同意',
  meeting_scheduled: '已安排约谈',
  met: '已见面',
  succeeded: '匹配成功',
  failed: '匹配失败',
  dismissed: '已放弃',
}

export const RECOMMENDATION_TYPE_LABELS: Record<RecommendationType, string> = {
  confirmed: '已确认候选',
  pending_confirmation: '待确认候选',
  rejected: '已排除',
}

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  pending: '待初始化',
  uploaded: '已上传',
  transcribing: '转录中',
  transcribed: '已转录',
  extracting: '提取中',
  done: '已完成',
  failed: '失败',
}

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  no_followup: '跟进提醒',
  no_new_info: '信息更新提醒',
  meeting_reminder: '约谈提醒',
  pending_confirmation: '待补问提醒',
}

export const EDUCATION_LEVEL_V2_LABELS: Record<EducationLevelV2, string> = {
  high_school_or_below: '高中及以下',
  junior_college: '专科',
  bachelor: '本科',
  master: '硕士',
  doctor: '博士',
  unknown: '未知',
}

export const MARITAL_HISTORY_LABELS: Record<MaritalHistoryType, string> = {
  never_married: '未婚',
  divorced: '离异',
  widowed: '丧偶',
  unknown: '未知',
}

export const HAS_CHILDREN_LABELS: Record<HasChildrenType, string> = {
  yes: '有',
  no: '无',
  unknown: '未知',
}

export const CUSTODY_STATUS_LABELS: Record<CustodyStatusType, string> = {
  self: '自己',
  ex_partner: '对方',
  shared: '共同',
  other: '其他',
  unknown: '未知',
}

export const HAS_ASSET_LABELS: Record<HasAssetType, string> = {
  yes: '有',
  no: '无',
  unknown: '未知',
}

export const LIFESTYLE_YN_LABELS: Record<LifestyleYnType, string> = {
  yes: '是',
  no: '否',
  unknown: '未知',
}

export const FREQUENCY_LABELS: Record<FrequencyType, string> = {
  occasionally: '偶尔',
  frequently: '频繁',
  daily: '每天',
  unknown: '未知',
}

export const FAMILY_ASSET_BAND_LABELS: Record<FamilyAssetBandType, string> = {
  A7: '千万级',
  A8: '亿级',
  A9: '十亿级',
  A10: '百亿级+',
  unknown: '未知',
}

export const INCOME_SOURCE_LABELS: Record<IncomeSourceCategory, string> = {
  salary: '工资薪酬',
  dividend: '股权分红',
  self_business: '自营业务',
  mixed: '混合来源',
  other: '其他',
  unknown: '未知',
}

export const URGENCY_LEVEL_LABELS: Record<UrgencyLevelType, string> = {
  low: '不急',
  normal: '正常',
  high: '较急',
  urgent: '非常急',
  unknown: '未知',
}

export const PARENTS_MARITAL_STATUS_LABELS: Record<ParentsMaritalStatusType, string> = {
  together: '在一起',
  divorced: '离异',
  widowed: '丧偶',
  unknown: '未知',
}

export const FINANCIAL_TIES_LABELS: Record<FinancialTiesType, string> = {
  yes: '有',
  no: '无',
  unknown: '未知',
}

export const LIFECYCLE_STATUS_LABELS: Record<LifecycleStatus, string> = {
  new_pending_completion: '新建待完善',
  actively_searching: '主动寻找中',
  recommended: '已被推介',
  meeting_in_progress: '约谈进行中',
  feedback_pending_entry: '等待反馈录入',
  paused: '暂停',
  matched_success: '匹配成功',
  archived: '已归档',
}

export const CERTIFICATION_TYPE_LABELS: Record<CertificationType, string> = {
  identity: '身份认证',
  education: '学历认证',
  income: '收入认证',
  assets: '资产认证',
  marital_history: '婚况认证',
  health: '健康认证',
  other: '其他认证',
}

export const CERTIFICATION_STATUS_LABELS: Record<CertificationStatus, string> = {
  not_submitted: '未认证',
  pending_review: '审核中',
  verified: '已认证',
  rejected: '未通过',
  expired: '已过期',
}

/** 认证标签展示优先级（空间有限时按此顺序取前 N 个） */
export const CERTIFICATION_DISPLAY_PRIORITY: CertificationType[] = [
  'identity',
  'marital_history',
  'education',
  'income',
  'assets',
  'health',
]

/** 各认证类型关联的正式字段 key */
export const CERTIFICATION_RELATED_FIELDS: Record<CertificationType, string[]> = {
  identity: ['full_name', 'gender', 'birth_year_month'],
  education: ['education_level_v2', 'bachelor_school', 'master_school', 'doctor_school'],
  income: ['monthly_income', 'annual_income', 'income_source_type'],
  assets: ['has_property', 'property_count', 'has_vehicle', 'vehicle_brand', 'vehicle_model', 'family_asset_band'],
  marital_history: ['marital_history_enum'],
  health: [],
  other: [],
}
