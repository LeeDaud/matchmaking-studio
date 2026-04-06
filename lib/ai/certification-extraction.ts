/**
 * 认证材料 AI 提取模块
 *
 * 流程：
 * 1. 图片 → base64（或 PDF → 图片 → base64）
 * 2. Claude Vision 读取材料内容，与档案快照比对
 * 3. 输出结构化比对结果（CertificationExtractionResult）
 */

import Anthropic from '@anthropic-ai/sdk'
import { CERTIFICATION_TYPE_LABELS, CERTIFICATION_RELATED_FIELDS } from '@/types/app'
import type { CertificationType } from '@/types/database'

// ──────────────────────────────────────────────────────────────
// 结果类型
// ──────────────────────────────────────────────────────────────

export type CertFieldComparison = {
  field_key: string
  field_label: string
  material_value: string | null   // 材料里读到的值（原始文字）
  profile_value: string | null    // 档案里当前的值
  match: 'match' | 'conflict' | 'new_info' | 'unreadable'
  confidence: 'high' | 'medium' | 'low'
  note?: string                   // AI 附加说明
  _action?: 'adopt' | 'ignore' | 'flag'  // 红娘操作记录
}

export type CertificationExtractionResult = {
  cert_type: CertificationType
  document_summary: string        // 一句话描述读到的是什么文件
  field_comparisons: CertFieldComparison[]
  extra_observations: string[]    // 材料中有但不在关联字段里的额外信息
  processing_notes: string[]
  extracted_at: string            // ISO timestamp
}

// ──────────────────────────────────────────────────────────────
// 字段标签映射（用于提示词）
// ──────────────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  full_name: '真实姓名',
  gender: '性别',
  birth_year_month: '出生年月',
  name: '档案姓名',
  age: '年龄',
  education_level_v2: '最高学历',
  bachelor_school: '本科院校',
  master_school: '硕士院校',
  doctor_school: '博士院校',
  monthly_income: '月收入',
  annual_income: '年收入',
  income_source_type: '收入来源',
  has_property: '是否有房',
  property_count: '房产数量',
  has_vehicle: '是否有车',
  vehicle_brand: '车品牌',
  vehicle_model: '车型号',
  family_asset_band: '家庭资产区间',
  marital_history_enum: '婚史',
}

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key
}

// ──────────────────────────────────────────────────────────────
// PDF → 图片（用 pdfjs-dist 渲染第一页为 PNG buffer）
// ──────────────────────────────────────────────────────────────

/** 从 PDF URL 提取纯文字（用于 Claude 文本分析）
 *
 * @returns [text, error] — text 为 null 表示提取失败，error 为错误信息
 */
async function pdfUrlToText(pdfUrl: string): Promise<[string | null, string | null]> {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

    const response = await fetch(pdfUrl)
    if (!response.ok) {
      return [null, `下载 PDF 失败 (HTTP ${response.status})`]
    }
    const arrayBuffer = await response.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
    const pdf = await loadingTask.promise
    const texts: string[] = []

    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: unknown) => {
          const t = item as { str?: string }
          return t.str ?? ''
        })
        .join(' ')
      texts.push(pageText)
    }

    const text = texts.join('\n\n').trim()
    if (!text) return [null, 'PDF 中未提取到文字内容（可能是扫描图片型 PDF）']
    return [text, null]
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return [null, `PDF 解析异常：${message}`]
  }
}

// ──────────────────────────────────────────────────────────────
// 提示词构建
// ──────────────────────────────────────────────────────────────

function buildSystemPrompt(isPdfMode: boolean): string {
  const inputDescription = isPdfMode
    ? '用户会提供从 PDF 中提取的原始文字内容'
    : '用户会提供认证材料的图片（证件照片、证书扫描件等）'

  return `你是婚恋机构的认证材料核验助手。

你的任务：
1. ${inputDescription}
2. 提取材料中与指定字段相关的信息
3. 与档案中的现有值逐字段比对
4. 输出结构化 JSON，绝对不要输出 Markdown 或解释文字

比对规则：
- match：材料值与档案值一致（允许小差异，如"男"vs"male"，或年龄相差1岁以内）
- conflict：材料值与档案值明确不同（如档案年龄30，材料显示28）
- new_info：档案值为空，材料提供了新信息
- unreadable：${isPdfMode ? '文字中找不到该字段的对应内容' : '图片模糊/遮挡/字段不存在于该材料中'}

置信度：
- high：字段清晰明确，无歧义
- medium：可识别但有轻微不确定性
- low：推断成分较多或存在歧义

输出 JSON 格式（严格遵守，不要输出其他内容）：
{
  "document_summary": "一句话描述文件类型和基本信息，如：中华人民共和国居民身份证，张三，男",
  "field_comparisons": [
    {
      "field_key": "字段英文key",
      "field_label": "字段中文名",
      "material_value": "材料中读到的原始值，读不到则null",
      "match": "match|conflict|new_info|unreadable",
      "confidence": "high|medium|low",
      "note": "可选，补充说明"
    }
  ],
  "extra_observations": ["其他值得注意但不在指定字段中的信息"],
  "processing_notes": ["处理备注，最多3条"]
}`
}

function buildUserPrompt(
  certType: CertificationType,
  relatedFields: string[],
  profileSnapshot: Record<string, unknown>,
  pdfText?: string | null,
): string {
  const certLabel = CERTIFICATION_TYPE_LABELS[certType]

  const fieldGuide = relatedFields.map((key) => {
    const label = getFieldLabel(key)
    const currentValue = profileSnapshot[key]
    const displayValue = currentValue === null || currentValue === undefined
      ? '（档案中暂无）'
      : String(currentValue)
    return `  - ${key}（${label}）：当前档案值 = ${displayValue}`
  }).join('\n')

  const isPdfMode = !!pdfText

  const parts = [
    `认证类型：${certLabel}`,
    '',
    `需要核验的字段：`,
    fieldGuide,
    '',
  ]

  if (isPdfMode) {
    parts.push(
      `以下是从 PDF 文件中提取的原始文字内容，请仔细阅读，从中找出上述字段的值，并与档案值逐一比对。`,
      `如果某个字段在以下文字中完全找不到对应内容，请标记 match 为 "unreadable"，material_value 为 null。`,
      '',
      '--- PDF 原始文字开始 ---',
      pdfText.slice(0, 4000),
      '--- PDF 原始文字结束 ---',
    )
  } else {
    parts.push(
      `请仔细读取图片中的所有文字，提取上述字段的值，并与档案值逐一比对。`,
      `如果某个字段在该类型材料中通常不会出现，请标记 match 为 "unreadable"，material_value 为 null。`,
    )
  }

  return parts.join('\n')
}

// ──────────────────────────────────────────────────────────────
// 主提取函数
// ──────────────────────────────────────────────────────────────

type ExtractFromMaterialInput = {
  certType: CertificationType
  fileUrl: string          // Supabase Storage 公开 URL
  fileExtension: string    // 'jpg' | 'png' | 'webp' | 'pdf'
  profileSnapshot: Record<string, unknown>  // 当前档案快照（相关字段）
}

export async function extractFromCertificationMaterial({
  certType,
  fileUrl,
  fileExtension,
  profileSnapshot,
}: ExtractFromMaterialInput): Promise<CertificationExtractionResult> {
  const relatedFields = CERTIFICATION_RELATED_FIELDS[certType] ?? []
  const isPdf = fileExtension.toLowerCase() === 'pdf'

  // ── 1. 准备内容 ──
  let imageBase64: string | null = null
  let pdfFallbackText: string | null = null
  let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'
  const processingNotes: string[] = []

  if (isPdf) {
    // PDF：提取文字，发给 Claude 进行文字分析
    const [text, pdfError] = await pdfUrlToText(fileUrl)
    pdfFallbackText = text
    if (pdfError) {
      processingNotes.push(`PDF 文字提取失败：${pdfError}`)
    }
    if (!pdfFallbackText) {
      // PDF 无文字内容，无法继续
      throw new Error(pdfError ?? 'PDF 文字提取失败，无法进行 AI 分析')
    }
    // imageBase64 保持 null，Claude 仅分析文字
  } else {
    // 图片：下载为 base64 走 Vision
    const ext = fileExtension.toLowerCase()
    if (ext === 'png') mediaType = 'image/png'
    else if (ext === 'webp') mediaType = 'image/webp'
    else mediaType = 'image/jpeg'

    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error(`下载材料文件失败: ${response.status}`)
    const buffer = await response.arrayBuffer()
    imageBase64 = Buffer.from(buffer).toString('base64')
  }

  // ── 2. 构建消息 ──
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const userContent: Anthropic.MessageParam['content'] = []

  if (imageBase64) {
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: imageBase64,
      },
    })
  }

  userContent.push({
    type: 'text',
    text: buildUserPrompt(certType, relatedFields, profileSnapshot, pdfFallbackText),
  })

  // ── 3. 调用 Claude ──
  let rawText = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      system: buildSystemPrompt(isPdf),
      messages: [{ role: 'user', content: userContent }],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    rawText = textBlock ? (textBlock as Anthropic.TextBlock).text : ''
  } catch (error) {
    throw new Error(`Claude Vision 调用失败: ${error instanceof Error ? error.message : String(error)}`)
  }

  // ── 4. 解析 JSON 输出 ──
  let parsed: {
    document_summary?: string
    field_comparisons?: Array<{
      field_key: string
      field_label?: string
      material_value?: string | null
      match?: string
      confidence?: string
      note?: string
    }>
    extra_observations?: string[]
    processing_notes?: string[]
  } = {}

  try {
    // 去掉可能的 markdown 代码块
    const jsonStr = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    parsed = {
      document_summary: '解析失败，请查看原始材料',
      field_comparisons: [],
      processing_notes: [`AI 输出无法解析为 JSON，原始内容长度：${rawText.length}`],
    }
  }

  // ── 5. 规范化输出 ──
  const fieldComparisons: CertFieldComparison[] = (parsed.field_comparisons ?? []).map((item) => ({
    field_key: item.field_key ?? '',
    field_label: item.field_label ?? getFieldLabel(item.field_key ?? ''),
    material_value: item.material_value ?? null,
    profile_value: (() => {
      const v = profileSnapshot[item.field_key ?? '']
      return v === null || v === undefined ? null : String(v)
    })(),
    match: (['match', 'conflict', 'new_info', 'unreadable'].includes(item.match ?? '')
      ? item.match as CertFieldComparison['match']
      : 'unreadable'),
    confidence: (['high', 'medium', 'low'].includes(item.confidence ?? '')
      ? item.confidence as CertFieldComparison['confidence']
      : 'medium'),
    note: item.note,
  }))

  return {
    cert_type: certType,
    document_summary: parsed.document_summary ?? '无法识别文件类型',
    field_comparisons: fieldComparisons,
    extra_observations: parsed.extra_observations ?? [],
    processing_notes: [...processingNotes, ...(parsed.processing_notes ?? [])],
    extracted_at: new Date().toISOString(),
  }
}
