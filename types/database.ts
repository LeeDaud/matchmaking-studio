export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type GenderType = 'male' | 'female'
export type ProfileStatus =
  | 'active'           // 活跃 · 积极寻找中
  | 'paused'           // 暂停 · 暂时搁置
  | 'matched_dating'   // 已匹配（恋爱中）
  | 'matched_married'  // 已匹配（已婚）
  | 'withdrawn'        // 退档
export type EducationLevel = 'high_school' | 'associate' | 'bachelor' | 'master' | 'phd' | 'other'
export type PrimaryIntent = 'marriage' | 'dating' | 'fertility'

// ── 甄恋 Phase-1 新类型 ──────────────────────────────────────

/** 8 态生命周期状态（替代旧 ProfileStatus 四态） */
export type LifecycleStatus =
  | 'new_pending_completion'
  | 'actively_searching'
  | 'recommended'
  | 'meeting_in_progress'
  | 'feedback_pending_entry'
  | 'paused'
  | 'matched_success'
  | 'archived'

/** 学历（新值域，替代旧 EducationLevel） */
export type EducationLevelV2 =
  | 'high_school_or_below'
  | 'junior_college'
  | 'bachelor'
  | 'master'
  | 'doctor'
  | 'unknown'

/** 婚史 */
export type MaritalHistoryType =
  | 'never_married'
  | 'divorced'
  | 'widowed'
  | 'unknown'

/** 是否有孩子（tri-state，替代 boolean） */
export type HasChildrenType = 'yes' | 'no' | 'unknown'

/** 抚养权归属 */
export type CustodyStatusType = 'self' | 'ex_partner' | 'shared' | 'other' | 'unknown'

/** 是否有房 / 有车 */
export type HasAssetType = 'yes' | 'no' | 'unknown'

/** 吸烟 / 饮酒状态（替代 boolean） */
export type LifestyleYnType = 'yes' | 'no' | 'unknown'

/** 吸烟 / 饮酒频率 */
export type FrequencyType = 'occasionally' | 'frequently' | 'daily' | 'unknown'

/** 家庭总资产档位 */
export type FamilyAssetBandType = 'A7' | 'A8' | 'A9' | 'A10' | 'unknown'

/** 收入来源性质 */
export type IncomeSourceCategory = 'salary' | 'dividend' | 'self_business' | 'mixed' | 'other' | 'unknown'

/** 迫切程度（替代旧 seriousness_score） */
export type UrgencyLevelType = 'low' | 'normal' | 'high' | 'urgent' | 'unknown'

/** 父母婚姻状态 */
export type ParentsMaritalStatusType = 'together' | 'divorced' | 'widowed' | 'unknown'

/** 与前任金融往来 */
export type FinancialTiesType = 'yes' | 'no' | 'unknown'

// ── 甄恋 Phase-1 认证类型 ──────────────────────────────────────

/** 认证类型 */
export type CertificationType =
  | 'identity'
  | 'education'
  | 'income'
  | 'assets'
  | 'marital_history'
  | 'health'
  | 'other'

/** 认证状态 */
export type CertificationStatus =
  | 'not_submitted'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'expired'

/** 补充材料类型 */
export type SupplementalMaterialKind = 'document' | 'screenshot' | 'voice_note' | 'other'

/** 补充材料来源 */
export type SupplementalMaterialSource = 'matchmaker' | 'client' | 'imported' | 'system'
export type RelationshipMode =
  | 'marriage_standard'
  | 'compensated_dating'
  | 'fertility_asset_arrangement'
export type TriState = 'yes' | 'no' | 'unknown'
export type ConversationStatus =
  | 'pending'
  | 'uploaded'
  | 'transcribing'
  | 'transcribed'
  | 'extracting'
  | 'done'
  | 'failed'
export type ConversationFailedStage = 'upload' | 'transcribe' | 'extract'
export type MatchStatus =
  | 'pending'
  | 'reviewing'
  | 'contacted_male'
  | 'contacted_female'
  | 'both_agreed'
  | 'meeting_scheduled'
  | 'met'
  | 'succeeded'
  | 'failed'
  | 'dismissed'
export type RecommendationType = 'confirmed' | 'pending_confirmation' | 'rejected'
export type ReminderType =
  | 'no_followup'
  | 'no_new_info'
  | 'meeting_reminder'
  | 'pending_confirmation'
export type UserRole = 'admin' | 'matchmaker'
export type FollowupTaskType =
  | 'missing_field'
  | 'sensitive_confirmation'
  | 'verification'
  | 'relationship_followup'
export type FollowupTaskStatus = 'open' | 'in_progress' | 'done' | 'dismissed'
export type ImportanceLevel = 'hard' | 'important' | 'normal' | 'flexible'
export type TaskPriority = 'high' | 'medium' | 'low'
export type FieldObservationSourceType =
  | 'self_reported'
  | 'matchmaker_summary'
  | 'ai_extracted'
  | 'verified_document'
export type FieldVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface Database {
  public: {
    Tables: {
      scoring_anchors: {
        Row: {
          id: string
          score: number
          gender: string
          description: string
          image_url: string | null
          uploaded_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          score: number
          gender: string
          description?: string
          image_url?: string | null
          uploaded_by?: string | null
          updated_at?: string
        }
        Update: {
          score?: number
          gender?: string
          description?: string
          image_url?: string | null
          uploaded_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          user_id: string
          role: UserRole
          display_name: string
          created_at: string
        }
        Insert: {
          user_id: string
          role: UserRole
          display_name: string
          created_at?: string
        }
        Update: {
          user_id?: string
          role?: UserRole
          display_name?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          matchmaker_id: string
          auth_user_id: string | null
          gender: GenderType
          status: ProfileStatus
          name: string
          phone: string | null
          nationality: string | null
          citizenship_list: string[] | null
          languages: string[] | null
          age: number | null
          height: number | null
          weight: number | null
          hometown: string | null
          city: string | null
          current_base_cities: string[] | null
          residency_status: string | null
          visa_flexibility: string | null
          travel_frequency: string | null
          time_zone_pattern: string | null
          education: EducationLevel | null
          school_notes: string | null
          occupation: string | null
          job_title: string | null
          industry: string | null
          work_intensity: string | null
          work_schedule: string | null
          annual_income: number | null
          income_range: string | null
          net_worth_range: string | null
          liquid_assets_range: string | null
          assets: string | null
          property_locations: string[] | null
          support_budget_range: string | null
          income_verified: boolean | null
          assets_verified: boolean | null
          appearance_score: number | null
          avatar_url: string | null
          lifestyle_photo_urls: string[] | null
          photo_urls: string[] | null
          marital_history: string | null
          marital_history_verified: boolean | null
          has_children: boolean | null
          children_notes: string | null
          hobbies: string[] | null
          interest_tags: string[] | null
          cultural_preferences: string[] | null
          travel_style_tags: string[] | null
          social_scene_tags: string[] | null
          lifestyle_tags: string[] | null
          personality_tags: string[] | null
          smoking: boolean | null
          drinking: boolean | null
          family_burden_notes: string | null
          parental_involvement: string | null
          seriousness_score: number | null
          followup_strategy: string | null
          hidden_expectations: string | null
          ai_summary: string | null
          raw_notes: string | null
          // ── 甄恋 Phase-1 新字段 ──────────────────────────────
          // P0
          full_name: string | null
          display_name: string | null
          current_city: string | null
          // P1
          birth_year_month: string | null
          height_cm: number | null
          weight_kg: number | null
          wechat_id: string | null
          // P2 学历
          education_level_v2: EducationLevelV2 | null
          bachelor_school: string | null
          master_school: string | null
          doctor_school: string | null
          major: string | null
          // P2 工作/收入
          company_name: string | null
          monthly_income: number | null
          income_source_type: IncomeSourceCategory | null
          // P2 资产
          has_property: HasAssetType | null
          property_count: number | null
          property_notes: string | null
          has_vehicle: HasAssetType | null
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_notes: string | null
          family_asset_band: FamilyAssetBandType | null
          financial_assets_notes: string | null
          insurance_notes: string | null
          // P3 婚育
          marital_history_enum: MaritalHistoryType | null
          marital_history_notes: string | null
          has_children_enum: HasChildrenType | null
          children_count: number | null
          children_age_notes: string | null
          custody_status: CustodyStatusType | null
          financial_ties_with_ex_partner: FinancialTiesType | null
          // P3 生活习惯
          smokes: LifestyleYnType | null
          smoking_frequency: FrequencyType | null
          drinks: LifestyleYnType | null
          drinking_frequency: FrequencyType | null
          // P3 家庭/性格
          urgency_level: UrgencyLevelType | null
          hukou_city: string | null
          native_place: string | null
          siblings_summary: string | null
          parents_occupation: string | null
          parents_marital_status: ParentsMaritalStatusType | null
          family_origin_notes: string | null
          mbti: string | null
          personality_summary: string | null
          self_description: string | null
          letter_to_partner: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          matchmaker_id: string
          auth_user_id?: string | null
          gender: GenderType
          status?: ProfileStatus
          name: string
          phone?: string | null
          nationality?: string | null
          citizenship_list?: string[] | null
          languages?: string[] | null
          age?: number | null
          height?: number | null
          weight?: number | null
          hometown?: string | null
          city?: string | null
          current_base_cities?: string[] | null
          residency_status?: string | null
          visa_flexibility?: string | null
          travel_frequency?: string | null
          time_zone_pattern?: string | null
          education?: EducationLevel | null
          school_notes?: string | null
          occupation?: string | null
          job_title?: string | null
          industry?: string | null
          work_intensity?: string | null
          work_schedule?: string | null
          annual_income?: number | null
          income_range?: string | null
          net_worth_range?: string | null
          liquid_assets_range?: string | null
          assets?: string | null
          property_locations?: string[] | null
          support_budget_range?: string | null
          income_verified?: boolean | null
          assets_verified?: boolean | null
          appearance_score?: number | null
          avatar_url?: string | null
          lifestyle_photo_urls?: string[] | null
          photo_urls?: string[] | null
          marital_history?: string | null
          marital_history_verified?: boolean | null
          has_children?: boolean | null
          children_notes?: string | null
          hobbies?: string[] | null
          interest_tags?: string[] | null
          cultural_preferences?: string[] | null
          travel_style_tags?: string[] | null
          social_scene_tags?: string[] | null
          lifestyle_tags?: string[] | null
          personality_tags?: string[] | null
          smoking?: boolean | null
          drinking?: boolean | null
          family_burden_notes?: string | null
          parental_involvement?: string | null
          seriousness_score?: number | null
          followup_strategy?: string | null
          hidden_expectations?: string | null
          ai_summary?: string | null
          raw_notes?: string | null
          // ── 甄恋 Phase-1 新字段 ──────────────────────────────
          full_name?: string | null
          display_name?: string | null
          current_city?: string | null
          birth_year_month?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          wechat_id?: string | null
          education_level_v2?: EducationLevelV2 | null
          bachelor_school?: string | null
          master_school?: string | null
          doctor_school?: string | null
          major?: string | null
          company_name?: string | null
          monthly_income?: number | null
          income_source_type?: IncomeSourceCategory | null
          has_property?: HasAssetType | null
          property_count?: number | null
          property_notes?: string | null
          has_vehicle?: HasAssetType | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_notes?: string | null
          family_asset_band?: FamilyAssetBandType | null
          financial_assets_notes?: string | null
          insurance_notes?: string | null
          marital_history_enum?: MaritalHistoryType | null
          marital_history_notes?: string | null
          has_children_enum?: HasChildrenType | null
          children_count?: number | null
          children_age_notes?: string | null
          custody_status?: CustodyStatusType | null
          financial_ties_with_ex_partner?: FinancialTiesType | null
          smokes?: LifestyleYnType | null
          smoking_frequency?: FrequencyType | null
          drinks?: LifestyleYnType | null
          drinking_frequency?: FrequencyType | null
          urgency_level?: UrgencyLevelType | null
          hukou_city?: string | null
          native_place?: string | null
          siblings_summary?: string | null
          parents_occupation?: string | null
          parents_marital_status?: ParentsMaritalStatusType | null
          family_origin_notes?: string | null
          mbti?: string | null
          personality_summary?: string | null
          self_description?: string | null
          letter_to_partner?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          matchmaker_id?: string
          auth_user_id?: string | null
          gender?: GenderType
          status?: ProfileStatus
          name?: string
          phone?: string | null
          nationality?: string | null
          citizenship_list?: string[] | null
          languages?: string[] | null
          age?: number | null
          height?: number | null
          weight?: number | null
          hometown?: string | null
          city?: string | null
          current_base_cities?: string[] | null
          residency_status?: string | null
          visa_flexibility?: string | null
          travel_frequency?: string | null
          time_zone_pattern?: string | null
          education?: EducationLevel | null
          school_notes?: string | null
          occupation?: string | null
          job_title?: string | null
          industry?: string | null
          work_intensity?: string | null
          work_schedule?: string | null
          annual_income?: number | null
          income_range?: string | null
          net_worth_range?: string | null
          liquid_assets_range?: string | null
          assets?: string | null
          property_locations?: string[] | null
          support_budget_range?: string | null
          income_verified?: boolean | null
          assets_verified?: boolean | null
          appearance_score?: number | null
          avatar_url?: string | null
          lifestyle_photo_urls?: string[] | null
          photo_urls?: string[] | null
          marital_history?: string | null
          marital_history_verified?: boolean | null
          has_children?: boolean | null
          children_notes?: string | null
          hobbies?: string[] | null
          interest_tags?: string[] | null
          cultural_preferences?: string[] | null
          travel_style_tags?: string[] | null
          social_scene_tags?: string[] | null
          lifestyle_tags?: string[] | null
          personality_tags?: string[] | null
          smoking?: boolean | null
          drinking?: boolean | null
          family_burden_notes?: string | null
          parental_involvement?: string | null
          seriousness_score?: number | null
          followup_strategy?: string | null
          hidden_expectations?: string | null
          ai_summary?: string | null
          raw_notes?: string | null
          // ── 甄恋 Phase-1 新字段 ──────────────────────────────
          full_name?: string | null
          display_name?: string | null
          current_city?: string | null
          birth_year_month?: string | null
          height_cm?: number | null
          weight_kg?: number | null
          wechat_id?: string | null
          education_level_v2?: EducationLevelV2 | null
          bachelor_school?: string | null
          master_school?: string | null
          doctor_school?: string | null
          major?: string | null
          company_name?: string | null
          monthly_income?: number | null
          income_source_type?: IncomeSourceCategory | null
          has_property?: HasAssetType | null
          property_count?: number | null
          property_notes?: string | null
          has_vehicle?: HasAssetType | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_notes?: string | null
          family_asset_band?: FamilyAssetBandType | null
          financial_assets_notes?: string | null
          insurance_notes?: string | null
          marital_history_enum?: MaritalHistoryType | null
          marital_history_notes?: string | null
          has_children_enum?: HasChildrenType | null
          children_count?: number | null
          children_age_notes?: string | null
          custody_status?: CustodyStatusType | null
          financial_ties_with_ex_partner?: FinancialTiesType | null
          smokes?: LifestyleYnType | null
          smoking_frequency?: FrequencyType | null
          drinks?: LifestyleYnType | null
          drinking_frequency?: FrequencyType | null
          urgency_level?: UrgencyLevelType | null
          hukou_city?: string | null
          native_place?: string | null
          siblings_summary?: string | null
          parents_occupation?: string | null
          parents_marital_status?: ParentsMaritalStatusType | null
          family_origin_notes?: string | null
          mbti?: string | null
          personality_summary?: string | null
          self_description?: string | null
          letter_to_partner?: string | null
        }
        Relationships: []
      }
      intentions: {
        Row: {
          id: string
          profile_id: string
          updated_at: string
          primary_intent: PrimaryIntent | null
          intent_notes: string | null
          relationship_mode: RelationshipMode | null
          relationship_mode_notes: string | null
          accepts_mode_marriage_standard: TriState
          accepts_mode_compensated_dating: TriState
          accepts_mode_fertility_asset_arrangement: TriState
          mode_boundary_notes: string | null
          financial_arrangement_expectation: string | null
          financial_arrangement_boundary: string | null
          exclusive_relationship_requirement: string | null
          fertility_preference: string | null
          fertility_timeline: string | null
          desired_children_count: number | null
          biological_child_requirement: boolean | null
          co_parenting_expectation: string | null
          child_support_expectation: string | null
          inheritance_expectation: string | null
          prenup_acceptance: TriState
          preferred_age_min: number | null
          preferred_age_max: number | null
          preferred_height_min: number | null
          preferred_cities: string[] | null
          settle_city_preferences: string[] | null
          accepts_long_distance: TriState
          relocation_willingness: TriState
          preferred_education: EducationLevel[] | null
          preferred_income_min: number | null
          preferred_net_worth_min: string | null
          preferred_industry_tags: string[] | null
          dealbreakers: string[] | null
          tolerance_notes: string | null
          acceptable_conditions: string[] | null
          long_distance_notes: string | null
          accepts_partner_marital_history: string[] | null
          accepts_partner_children: TriState
          relationship_pace: string | null
          communication_style: string | null
          biggest_concerns: string[] | null
          implicit_intent_notes: string | null
          preference_importance: Json | null
          dating_frequency_expectation: string | null
          monthly_date_budget: string | null
          wedding_scale_preference: string | null
          accepts_parents_cohabitation: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          updated_at?: string
          primary_intent?: PrimaryIntent | null
          intent_notes?: string | null
          relationship_mode?: RelationshipMode | null
          relationship_mode_notes?: string | null
          accepts_mode_marriage_standard?: TriState
          accepts_mode_compensated_dating?: TriState
          accepts_mode_fertility_asset_arrangement?: TriState
          mode_boundary_notes?: string | null
          financial_arrangement_expectation?: string | null
          financial_arrangement_boundary?: string | null
          exclusive_relationship_requirement?: string | null
          fertility_preference?: string | null
          fertility_timeline?: string | null
          desired_children_count?: number | null
          biological_child_requirement?: boolean | null
          co_parenting_expectation?: string | null
          child_support_expectation?: string | null
          inheritance_expectation?: string | null
          prenup_acceptance?: TriState
          preferred_age_min?: number | null
          preferred_age_max?: number | null
          preferred_height_min?: number | null
          preferred_cities?: string[] | null
          settle_city_preferences?: string[] | null
          accepts_long_distance?: TriState
          relocation_willingness?: TriState
          preferred_education?: EducationLevel[] | null
          preferred_income_min?: number | null
          preferred_net_worth_min?: string | null
          preferred_industry_tags?: string[] | null
          dealbreakers?: string[] | null
          tolerance_notes?: string | null
          acceptable_conditions?: string[] | null
          long_distance_notes?: string | null
          accepts_partner_marital_history?: string[] | null
          accepts_partner_children?: TriState
          relationship_pace?: string | null
          communication_style?: string | null
          biggest_concerns?: string[] | null
          implicit_intent_notes?: string | null
          preference_importance?: Json | null
          dating_frequency_expectation?: string | null
          monthly_date_budget?: string | null
          wedding_scale_preference?: string | null
          accepts_parents_cohabitation?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          updated_at?: string
          primary_intent?: PrimaryIntent | null
          intent_notes?: string | null
          relationship_mode?: RelationshipMode | null
          relationship_mode_notes?: string | null
          accepts_mode_marriage_standard?: TriState
          accepts_mode_compensated_dating?: TriState
          accepts_mode_fertility_asset_arrangement?: TriState
          mode_boundary_notes?: string | null
          financial_arrangement_expectation?: string | null
          financial_arrangement_boundary?: string | null
          exclusive_relationship_requirement?: string | null
          fertility_preference?: string | null
          fertility_timeline?: string | null
          desired_children_count?: number | null
          biological_child_requirement?: boolean | null
          co_parenting_expectation?: string | null
          child_support_expectation?: string | null
          inheritance_expectation?: string | null
          prenup_acceptance?: TriState
          preferred_age_min?: number | null
          preferred_age_max?: number | null
          preferred_height_min?: number | null
          preferred_cities?: string[] | null
          settle_city_preferences?: string[] | null
          accepts_long_distance?: TriState
          relocation_willingness?: TriState
          preferred_education?: EducationLevel[] | null
          preferred_income_min?: number | null
          preferred_net_worth_min?: string | null
          preferred_industry_tags?: string[] | null
          dealbreakers?: string[] | null
          tolerance_notes?: string | null
          acceptable_conditions?: string[] | null
          long_distance_notes?: string | null
          accepts_partner_marital_history?: string[] | null
          accepts_partner_children?: TriState
          relationship_pace?: string | null
          communication_style?: string | null
          biggest_concerns?: string[] | null
          implicit_intent_notes?: string | null
          preference_importance?: Json | null
          dating_frequency_expectation?: string | null
          monthly_date_budget?: string | null
          wedding_scale_preference?: string | null
          accepts_parents_cohabitation?: string | null
        }
        Relationships: []
      }
      trait_profiles: {
        Row: {
          id: string
          profile_id: string
          updated_at: string
          hobby_ranked_tags: string[] | null
          exercise_habits: string | null
          diet_habits: string | null
          sleep_schedule: string | null
          smoking_habit: string | null
          drinking_habit: string | null
          social_preference: string | null
          spending_style: string | null
          emotional_stability: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          updated_at?: string
          hobby_ranked_tags?: string[] | null
          exercise_habits?: string | null
          diet_habits?: string | null
          sleep_schedule?: string | null
          smoking_habit?: string | null
          drinking_habit?: string | null
          social_preference?: string | null
          spending_style?: string | null
          emotional_stability?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          updated_at?: string
          hobby_ranked_tags?: string[] | null
          exercise_habits?: string | null
          diet_habits?: string | null
          sleep_schedule?: string | null
          smoking_habit?: string | null
          drinking_habit?: string | null
          social_preference?: string | null
          spending_style?: string | null
          emotional_stability?: string | null
        }
        Relationships: []
      }
      field_observations: {
        Row: {
          id: string
          profile_id: string
          conversation_id: string
          field_key: string
          field_value_json: Json | null
          source_type: FieldObservationSourceType
          confidence: number
          verification_status: FieldVerificationStatus
          evidence_text: string | null
          start_time_seconds: number | null
          end_time_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          conversation_id: string
          field_key: string
          field_value_json?: Json | null
          source_type?: FieldObservationSourceType
          confidence?: number
          verification_status?: FieldVerificationStatus
          evidence_text?: string | null
          start_time_seconds?: number | null
          end_time_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          conversation_id?: string
          field_key?: string
          field_value_json?: Json | null
          source_type?: FieldObservationSourceType
          confidence?: number
          verification_status?: FieldVerificationStatus
          evidence_text?: string | null
          start_time_seconds?: number | null
          end_time_seconds?: number | null
          created_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          created_at: string
          talked_at: string | null
          profile_id: string
          matchmaker_id: string
          audio_url: string | null
          audio_duration: number | null
          status: ConversationStatus
          failed_stage: ConversationFailedStage | null
          error_message: string | null
          transcript: string | null
          transcript_verbose_json: Json | null
          extracted_fields: Json | null
          extraction_notes: string | null
          missing_fields: string[] | null
          suggested_questions: string[] | null
          reviewed_by: string | null
          reviewed_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          talked_at?: string | null
          profile_id: string
          matchmaker_id: string
          audio_url?: string | null
          audio_duration?: number | null
          status?: ConversationStatus
          failed_stage?: ConversationFailedStage | null
          error_message?: string | null
          transcript?: string | null
          transcript_verbose_json?: Json | null
          extracted_fields?: Json | null
          extraction_notes?: string | null
          missing_fields?: string[] | null
          suggested_questions?: string[] | null
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          talked_at?: string | null
          profile_id?: string
          matchmaker_id?: string
          audio_url?: string | null
          audio_duration?: number | null
          status?: ConversationStatus
          failed_stage?: ConversationFailedStage | null
          error_message?: string | null
          transcript?: string | null
          transcript_verbose_json?: Json | null
          extracted_fields?: Json | null
          extraction_notes?: string | null
          missing_fields?: string[] | null
          suggested_questions?: string[] | null
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          male_profile_id: string
          female_profile_id: string
          matchmaker_id: string
          match_score: number
          score_breakdown: Json | null
          match_reason: string | null
          recommendation_type: RecommendationType
          pending_reasons: string[] | null
          required_followup_fields: string[] | null
          suggested_followup_questions: string[] | null
          status: MatchStatus
          matchmaker_notes: string | null
          meeting_time: string | null
          meeting_location: string | null
          outcome_notes: string | null
          dismissed_reason: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          male_profile_id: string
          female_profile_id: string
          matchmaker_id: string
          match_score: number
          score_breakdown?: Json | null
          match_reason?: string | null
          recommendation_type?: RecommendationType
          pending_reasons?: string[] | null
          required_followup_fields?: string[] | null
          suggested_followup_questions?: string[] | null
          status?: MatchStatus
          matchmaker_notes?: string | null
          meeting_time?: string | null
          meeting_location?: string | null
          outcome_notes?: string | null
          dismissed_reason?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          male_profile_id?: string
          female_profile_id?: string
          matchmaker_id?: string
          match_score?: number
          score_breakdown?: Json | null
          match_reason?: string | null
          recommendation_type?: RecommendationType
          pending_reasons?: string[] | null
          required_followup_fields?: string[] | null
          suggested_followup_questions?: string[] | null
          status?: MatchStatus
          matchmaker_notes?: string | null
          meeting_time?: string | null
          meeting_location?: string | null
          outcome_notes?: string | null
          dismissed_reason?: string | null
        }
        Relationships: []
      }
      followup_tasks: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          profile_id: string | null
          match_id: string | null
          matchmaker_id: string
          task_type: FollowupTaskType
          priority: TaskPriority
          field_keys: string[] | null
          question_list: string[] | null
          rationale: string | null
          status: FollowupTaskStatus
          completed_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          profile_id?: string | null
          match_id?: string | null
          matchmaker_id: string
          task_type: FollowupTaskType
          priority?: TaskPriority
          field_keys?: string[] | null
          question_list?: string[] | null
          rationale?: string | null
          status?: FollowupTaskStatus
          completed_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          profile_id?: string | null
          match_id?: string | null
          matchmaker_id?: string
          task_type?: FollowupTaskType
          priority?: TaskPriority
          field_keys?: string[] | null
          question_list?: string[] | null
          rationale?: string | null
          status?: FollowupTaskStatus
          completed_at?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          id: string
          created_at: string
          matchmaker_id: string
          profile_id: string | null
          match_id: string | null
          type: ReminderType
          message: string
          is_read: boolean
          read_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          matchmaker_id: string
          profile_id?: string | null
          match_id?: string | null
          type: ReminderType
          message: string
          is_read?: boolean
          read_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          matchmaker_id?: string
          profile_id?: string | null
          match_id?: string | null
          type?: ReminderType
          message?: string
          is_read?: boolean
          read_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: Json
          description: string | null
          updated_at: string | null
        }
        Insert: {
          key: string
          value: Json
          description?: string | null
          updated_at?: string | null
        }
        Update: {
          key?: string
          value?: Json
          description?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      // ── 甄恋 Phase-1 新表 ────────────────────────────────────
      customer_lifecycle: {
        Row: {
          id: string
          profile_id: string
          status: LifecycleStatus
          owner: string | null
          next_action: string | null
          due_at: string | null
          blocking_reason: string | null
          last_progressed_at: string | null
          last_contact_at: string | null
          paused_at: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          status?: LifecycleStatus
          owner?: string | null
          next_action?: string | null
          due_at?: string | null
          blocking_reason?: string | null
          last_progressed_at?: string | null
          last_contact_at?: string | null
          paused_at?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          status?: LifecycleStatus
          owner?: string | null
          next_action?: string | null
          due_at?: string | null
          blocking_reason?: string | null
          last_progressed_at?: string | null
          last_contact_at?: string | null
          paused_at?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_source: {
        Row: {
          id: string
          profile_id: string
          primary_source_channel: string | null
          source_code: string | null
          acquired_at: string | null
          source_notes: string | null
          referrer_name: string | null
          campaign_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          primary_source_channel?: string | null
          source_code?: string | null
          acquired_at?: string | null
          source_notes?: string | null
          referrer_name?: string | null
          campaign_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          primary_source_channel?: string | null
          source_code?: string | null
          acquired_at?: string | null
          source_notes?: string | null
          referrer_name?: string | null
          campaign_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      // ── 甄恋 Phase-1 认证表 ──────────────────────────────────
      profile_certifications: {
        Row: {
          id: string
          profile_id: string
          type: CertificationType
          status: CertificationStatus
          material_refs: string[]
          submitted_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          review_notes: string | null
          rejection_reason: string | null
          expires_at: string | null
          related_field_keys: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          type: CertificationType
          status?: CertificationStatus
          material_refs?: string[]
          submitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          review_notes?: string | null
          rejection_reason?: string | null
          expires_at?: string | null
          related_field_keys?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          type?: CertificationType
          status?: CertificationStatus
          material_refs?: string[]
          submitted_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          review_notes?: string | null
          rejection_reason?: string | null
          expires_at?: string | null
          related_field_keys?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      supplemental_materials: {
        Row: {
          id: string
          profile_id: string
          kind: SupplementalMaterialKind
          url: string
          title: string | null
          description: string | null
          source: SupplementalMaterialSource
          uploaded_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          kind: SupplementalMaterialKind
          url: string
          title?: string | null
          description?: string | null
          source?: SupplementalMaterialSource
          uploaded_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          kind?: SupplementalMaterialKind
          url?: string
          title?: string | null
          description?: string | null
          source?: SupplementalMaterialSource
          uploaded_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      gender_type: GenderType
      profile_status: ProfileStatus
      education_level: EducationLevel
      primary_intent: PrimaryIntent
      relationship_mode: RelationshipMode
      tri_state: TriState
      conversation_status: ConversationStatus
      match_status: MatchStatus
      recommendation_type: RecommendationType
      reminder_type: ReminderType
      user_role: UserRole
      followup_task_type: FollowupTaskType
      followup_task_status: FollowupTaskStatus
      importance_level: ImportanceLevel
      task_priority: TaskPriority
      field_observation_source_type: FieldObservationSourceType
      field_verification_status: FieldVerificationStatus
      // Phase-1 新 enum
      lifecycle_status: LifecycleStatus
      education_level_v2: EducationLevelV2
      marital_history_type: MaritalHistoryType
      has_children_type: HasChildrenType
      custody_status_type: CustodyStatusType
      has_asset_type: HasAssetType
      lifestyle_yn_type: LifestyleYnType
      frequency_type: FrequencyType
      family_asset_band_type: FamilyAssetBandType
      income_source_category: IncomeSourceCategory
      urgency_level_type: UrgencyLevelType
      parents_marital_status_type: ParentsMaritalStatusType
      financial_ties_type: FinancialTiesType
      certification_type: CertificationType
      certification_status: CertificationStatus
      supplemental_material_kind: SupplementalMaterialKind
      supplemental_material_source: SupplementalMaterialSource
    }
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Intention = Database['public']['Tables']['intentions']['Row']
export type IntentionInsert = Database['public']['Tables']['intentions']['Insert']
export type IntentionUpdate = Database['public']['Tables']['intentions']['Update']

export type TraitProfile = Database['public']['Tables']['trait_profiles']['Row']
export type TraitProfileInsert = Database['public']['Tables']['trait_profiles']['Insert']
export type TraitProfileUpdate = Database['public']['Tables']['trait_profiles']['Update']

export type FieldObservation = Database['public']['Tables']['field_observations']['Row']
export type FieldObservationInsert = Database['public']['Tables']['field_observations']['Insert']
export type FieldObservationUpdate = Database['public']['Tables']['field_observations']['Update']

export type Conversation = Database['public']['Tables']['conversations']['Row']
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update']

export type Match = Database['public']['Tables']['matches']['Row']
export type MatchInsert = Database['public']['Tables']['matches']['Insert']
export type MatchUpdate = Database['public']['Tables']['matches']['Update']

export type FollowupTask = Database['public']['Tables']['followup_tasks']['Row']
export type FollowupTaskInsert = Database['public']['Tables']['followup_tasks']['Insert']
export type FollowupTaskUpdate = Database['public']['Tables']['followup_tasks']['Update']

export type Reminder = Database['public']['Tables']['reminders']['Row']
export type ReminderInsert = Database['public']['Tables']['reminders']['Insert']
export type ReminderUpdate = Database['public']['Tables']['reminders']['Update']

// Phase-1 新表类型别名
export type CustomerLifecycle = Database['public']['Tables']['customer_lifecycle']['Row']
export type CustomerLifecycleInsert = Database['public']['Tables']['customer_lifecycle']['Insert']
export type CustomerLifecycleUpdate = Database['public']['Tables']['customer_lifecycle']['Update']

export type CustomerSource = Database['public']['Tables']['customer_source']['Row']
export type CustomerSourceInsert = Database['public']['Tables']['customer_source']['Insert']
export type CustomerSourceUpdate = Database['public']['Tables']['customer_source']['Update']

export type ProfileCertification = Database['public']['Tables']['profile_certifications']['Row']
export type ProfileCertificationInsert = Database['public']['Tables']['profile_certifications']['Insert']
export type ProfileCertificationUpdate = Database['public']['Tables']['profile_certifications']['Update']

export type SupplementalMaterial = Database['public']['Tables']['supplemental_materials']['Row']
export type SupplementalMaterialInsert = Database['public']['Tables']['supplemental_materials']['Insert']
export type SupplementalMaterialUpdate = Database['public']['Tables']['supplemental_materials']['Update']

export type UserRoleRow = Database['public']['Tables']['user_roles']['Row']
export type UserRoleInsert = Database['public']['Tables']['user_roles']['Insert']
export type UserRoleUpdate = Database['public']['Tables']['user_roles']['Update']
