-- ============================================================
-- 014: 认证体系 + 补充材料表（甄恋 Phase-1 模块一 2.4）
-- ============================================================

-- 1. 枚举类型
DO $$ BEGIN
  CREATE TYPE certification_type AS ENUM (
    'identity', 'education', 'income', 'assets',
    'marital_history', 'health', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE certification_status AS ENUM (
    'not_submitted', 'pending_review', 'verified', 'rejected', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE supplemental_material_kind AS ENUM (
    'document', 'screenshot', 'voice_note', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE supplemental_material_source AS ENUM (
    'matchmaker', 'client', 'imported', 'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. profile_certifications 表
CREATE TABLE IF NOT EXISTS profile_certifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          certification_type NOT NULL,
  status        certification_status NOT NULL DEFAULT 'not_submitted',
  material_refs text[] NOT NULL DEFAULT '{}',
  submitted_at  timestamptz,
  reviewed_at   timestamptz,
  reviewed_by   uuid REFERENCES auth.users(id),
  review_notes  text,
  rejection_reason text,
  expires_at    timestamptz,
  related_field_keys text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- 每个客户每种认证类型只有一条记录
  UNIQUE (profile_id, type)
);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_profile_certifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profile_certifications_updated_at ON profile_certifications;
CREATE TRIGGER trg_profile_certifications_updated_at
  BEFORE UPDATE ON profile_certifications
  FOR EACH ROW EXECUTE FUNCTION update_profile_certifications_updated_at();

-- 索引
CREATE INDEX IF NOT EXISTS idx_certifications_profile ON profile_certifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_certifications_status  ON profile_certifications(status);
CREATE INDEX IF NOT EXISTS idx_certifications_pending ON profile_certifications(status)
  WHERE status = 'pending_review';

-- RLS
ALTER TABLE profile_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matchmaker can view own client certifications"
  ON profile_certifications FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE matchmaker_id = auth.uid()
    )
  );

CREATE POLICY "matchmaker can insert own client certifications"
  ON profile_certifications FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE matchmaker_id = auth.uid()
    )
  );

CREATE POLICY "matchmaker can update own client certifications"
  ON profile_certifications FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE matchmaker_id = auth.uid()
    )
  );

-- 3. supplemental_materials 表
CREATE TABLE IF NOT EXISTS supplemental_materials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind        supplemental_material_kind NOT NULL DEFAULT 'other',
  url         text NOT NULL,
  title       text,
  description text,
  source      supplemental_material_source NOT NULL DEFAULT 'matchmaker',
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplemental_materials_profile ON supplemental_materials(profile_id);

-- RLS
ALTER TABLE supplemental_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matchmaker can view own client materials"
  ON supplemental_materials FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE matchmaker_id = auth.uid()
    )
  );

CREATE POLICY "matchmaker can insert own client materials"
  ON supplemental_materials FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE matchmaker_id = auth.uid()
    )
  );

CREATE POLICY "matchmaker can delete own client materials"
  ON supplemental_materials FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE matchmaker_id = auth.uid()
    )
  );
