/**
 * 补充资料 AI 信息提取模块
 *
 * 与认证材料提取不同，这里不做字段级比对，而是做开放式信息摘要：
 * 从上传的截图或 PDF 中读取任何与客户相关的信息，
 * 供红娘阅读参考、丰富对客户的了解。
 */

import Anthropic from '@anthropic-ai/sdk'
import type { SupplementalMaterialKind } from '@/types/database'

// ──────────────────────────────────────────────────────────────
// 结果类型
// ──────────────────────────────────────────────────────────────

export type SupplementalObservation = {
  category: string      // 观察类别：如"收入与财务"、"家庭情况"、"性格与价值观"、"婚恋态度"等
  content: string       // 观察内容，一句话描述
  confidence: 'high' | 'medium' | 'low'
  source_hint?: string  // 内容来自文件的哪个部分（如"第2页"、"截图右上角"）
}

export type SupplementalExtractionResult = {
  material_kind: SupplementalMaterialKind
  document_summary: string           // 一句话描述：这是什么材料
  observations: SupplementalObservation[]  // 所有观察项
  raw_text_snippet?: string          // 对于 PDF，保存前 500 字作为原文参考
  processing_notes: string[]
  extracted_at: string               // ISO timestamp
}

// ──────────────────────────────────────────────────────────────
// PDF 文字提取（与 certification-extraction.ts 逻辑相同）
// ──────────────────────────────────────────────────────────────

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
// 提示词
// ──────────────────────────────────────────────────────────────

function buildSystemPrompt(isPdfMode: boolean): string {
  const inputDesc = isPdfMode
    ? '用户会提供从 PDF 文件中提取的原始文字内容'
    : '用户会提供截图或图片（可能是微信聊天记录、朋友圈截图、个人照片、证书截图等）'

  return `你是婚恋红娘的智能助理。你的任务是帮助红娘快速了解客户。

${inputDesc}，请仔细阅读，提取其中任何与该客户相关的有价值信息。

关注范围（不限于此）：
- 收入与财务状况（月薪、年薪、存款、房产、车辆）
- 职业与工作（公司类型、职位、工作强度）
- 家庭情况（父母、兄弟姐妹、家庭氛围）
- 婚恋态度（择偶标准、对婚姻的期待、着急程度）
- 性格与价值观（生活方式、兴趣爱好、性格特点）
- 过往感情（前任、离婚原因、感情经历）
- 其他值得红娘注意的信息

输出格式（严格 JSON，不要输出 Markdown 或任何解释文字）：
{
  "document_summary": "一句话描述这份材料是什么，如：微信与家人的群聊截图，涉及家庭经济情况讨论",
  "observations": [
    {
      "category": "收入与财务",
      "content": "提到自己月薪税后 3 万，另有年终奖约 10 万",
      "confidence": "high",
      "source_hint": "可选，内容来源提示"
    }
  ],
  "processing_notes": ["最多 3 条处理备注，如：图片部分模糊，左侧内容未能识别"]
}

规则：
- 只输出有实质内容的观察，不要输出"未发现相关信息"类的空条目
- confidence high=明确写到, medium=可合理推断, low=猜测成分较多
- 如果材料中没有任何有价值的信息，observations 返回空数组，document_summary 说明原因
- 绝对不要输出 JSON 以外的任何内容`
}

function buildUserPrompt(
  kind: SupplementalMaterialKind,
  pdfText?: string | null,
): string {
  const kindLabel: Record<SupplementalMaterialKind, string> = {
    document: 'PDF 文档',
    screenshot: '截图',
    voice_note: '语音记录',
    other: '其他材料',
  }

  const parts = [`材料类型：${kindLabel[kind] ?? kind}`, '']

  if (pdfText) {
    parts.push(
      '以下是从 PDF 中提取的原始文字，请仔细阅读并提取有价值的信息：',
      '',
      '--- 文字内容开始 ---',
      pdfText.slice(0, 4000),
      '--- 文字内容结束 ---',
    )
  } else {
    parts.push('请仔细观察图片中的所有内容，提取任何与该客户相关的有价值信息。')
  }

  return parts.join('\n')
}

// ──────────────────────────────────────────────────────────────
// 主提取函数
// ──────────────────────────────────────────────────────────────

type ExtractFromSupplementalInput = {
  materialId: string
  kind: SupplementalMaterialKind
  fileUrl: string
  fileExtension: string
}

export async function extractFromSupplementalMaterial({
  materialId: _materialId,
  kind,
  fileUrl,
  fileExtension,
}: ExtractFromSupplementalInput): Promise<SupplementalExtractionResult> {
  const ext = fileExtension.toLowerCase()
  const isPdf = ext === 'pdf'
  const processingNotes: string[] = []

  let imageBase64: string | null = null
  let pdfText: string | null = null
  let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg'

  if (isPdf) {
    const [text, error] = await pdfUrlToText(fileUrl)
    pdfText = text
    if (error) {
      processingNotes.push(`PDF 文字提取失败：${error}`)
    }
    if (!pdfText) {
      throw new Error(error ?? 'PDF 文字提取失败，无法进行 AI 分析')
    }
  } else {
    if (ext === 'png') mediaType = 'image/png'
    else if (ext === 'webp') mediaType = 'image/webp'
    else mediaType = 'image/jpeg'

    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error(`下载文件失败: ${response.status}`)
    const buffer = await response.arrayBuffer()
    imageBase64 = Buffer.from(buffer).toString('base64')
  }

  // 构建消息
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const userContent: Anthropic.MessageParam['content'] = []

  if (imageBase64) {
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: imageBase64 },
    })
  }

  userContent.push({
    type: 'text',
    text: buildUserPrompt(kind, pdfText),
  })

  // 调用 Claude
  let rawText = ''
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2048,
      system: buildSystemPrompt(isPdf),
      messages: [{ role: 'user', content: userContent }],
    })
    const block = message.content.find((b) => b.type === 'text')
    rawText = block ? (block as Anthropic.TextBlock).text : ''
  } catch (error) {
    throw new Error(`Claude 调用失败: ${error instanceof Error ? error.message : String(error)}`)
  }

  // 解析 JSON
  let parsed: {
    document_summary?: string
    observations?: Array<{
      category: string
      content: string
      confidence?: string
      source_hint?: string
    }>
    processing_notes?: string[]
  } = {}

  try {
    const jsonStr = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    parsed = {
      document_summary: '解析失败，请查看原始材料',
      observations: [],
      processing_notes: [`AI 输出无法解析为 JSON，原始内容长度：${rawText.length}`],
    }
  }

  // 规范化
  const observations: SupplementalObservation[] = (parsed.observations ?? []).map((item) => ({
    category: item.category ?? '其他',
    content: item.content ?? '',
    confidence: (['high', 'medium', 'low'].includes(item.confidence ?? '')
      ? item.confidence as SupplementalObservation['confidence']
      : 'medium'),
    source_hint: item.source_hint,
  })).filter((o) => o.content.trim().length > 0)

  return {
    material_kind: kind,
    document_summary: parsed.document_summary ?? '无法识别材料类型',
    observations,
    raw_text_snippet: pdfText ? pdfText.slice(0, 500) : undefined,
    processing_notes: [...processingNotes, ...(parsed.processing_notes ?? [])],
    extracted_at: new Date().toISOString(),
  }
}
