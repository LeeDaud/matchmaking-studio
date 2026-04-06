-- 015_supplemental_ai_extraction.sql
-- 为 supplemental_materials 表添加 AI 提取结果字段

ALTER TABLE supplemental_materials
  ADD COLUMN IF NOT EXISTS extraction_result  jsonb,
  ADD COLUMN IF NOT EXISTS extracted_at       timestamptz,
  ADD COLUMN IF NOT EXISTS extraction_status  text
    CHECK (extraction_status IN ('pending', 'processing', 'done', 'failed'));
