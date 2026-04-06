'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Loader2, Image, FileText, Eye, Trash2,
  Sparkles, ChevronDown, ChevronUp, RefreshCw, XCircle,
} from 'lucide-react'
import type { SupplementalMaterial } from '@/types/database'
import type { SupplementalExtractionResult, SupplementalObservation } from '@/lib/ai/supplemental-extraction'

interface DataImportPanelProps {
  profileId: string
  materials: SupplementalMaterial[]
}

type ImportChannel = 'pdf' | 'screenshot'

const CHANNEL_META: Record<ImportChannel, { label: string; description: string; accept: string; icon: React.ReactNode }> = {
  pdf: {
    label: 'PDF 资料导入',
    description: '上传客户 PDF 格式的个人资料，AI 将自动读取其中的关键信息。',
    accept: '.pdf,application/pdf',
    icon: <FileText className="h-5 w-5" />,
  },
  screenshot: {
    label: '截图上传',
    description: '上传微信聊天截图、朋友圈截图等，AI 将自动提取有价值的信息。',
    accept: 'image/*',
    icon: <Image className="h-5 w-5" />,
  },
}

const CONFIDENCE_STYLE: Record<SupplementalObservation['confidence'], string> = {
  high: 'text-foreground/85',
  medium: 'text-foreground/70',
  low: 'text-muted-foreground italic',
}

function isPdfMaterial(material: SupplementalMaterial) {
  return (
    material.kind === 'document' ||
    (material.url?.toLowerCase().includes('.pdf') ?? false)
  )
}

/* ── AI 提取结果展示 ─────────────────────────────────── */

function ExtractionPanel({
  material,
  onRefresh,
}: {
  material: SupplementalMaterial
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  const status = material.extraction_status
  const resultRaw = material.extraction_result as Record<string, unknown> | null

  // 失败状态
  if (status === 'failed') {
    const errorMsg = (resultRaw?.error as string) ?? 'AI 提取失败'
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl bg-red-50/60 px-3 py-2 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">{errorMsg}</span>
        <button className="text-[11px] underline-offset-2 hover:underline" onClick={onRefresh}>
          刷新
        </button>
      </div>
    )
  }

  // 处理中 / pending
  if (status === 'pending' || status === 'processing' || (!status && !resultRaw)) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground dark:bg-white/[0.03]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/60" />
        <span>AI 正在读取内容…</span>
        <button className="ml-auto text-[11px] underline-offset-2 hover:underline" onClick={onRefresh}>
          刷新
        </button>
      </div>
    )
  }

  // 无结果（status=done 但 resultRaw 为空）
  if (!resultRaw) return null

  // 解析为强类型
  const extraction = resultRaw as unknown as SupplementalExtractionResult
  const observations = extraction.observations ?? []

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-border/50 bg-white/60 dark:border-white/6 dark:bg-white/[0.025]">
      {/* 摘要行 */}
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        <span className="min-w-0 flex-1 truncate text-xs text-foreground/80">
          {extraction.document_summary}
        </span>
        {observations.length > 0 && (
          <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {observations.length} 条观察
          </span>
        )}
        {expanded
          ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        }
      </button>

      {/* 详情 */}
      {expanded && (
        <div className="border-t border-border/50 px-3 py-2 dark:border-white/6">
          {observations.length === 0 ? (
            <p className="py-1 text-[11px] text-muted-foreground">未从材料中发现有价值的信息</p>
          ) : (
            <div className="space-y-1.5">
              {observations.map((obs, i) => (
                <div key={i} className="flex gap-2 text-[11px]">
                  <span className="mt-0.5 shrink-0 rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground dark:bg-white/[0.05]">
                    {obs.category}
                  </span>
                  <span className={CONFIDENCE_STYLE[obs.confidence]}>
                    {obs.content}
                    {obs.confidence === 'low' && (
                      <span className="ml-1 text-[10px] text-muted-foreground">（低置信度）</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground/60">
            <span>
              {extraction.extracted_at
                ? `提取时间：${new Date(extraction.extracted_at).toLocaleString('zh-CN')}`
                : ''}
            </span>
            <button
              className="flex items-center gap-1 hover:text-muted-foreground"
              onClick={onRefresh}
            >
              <RefreshCw className="h-2.5 w-2.5" />
              刷新
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 单条材料行 ───────────────────────────────────────── */

function MaterialItem({ material, onDeleted, onRefresh }: {
  material: SupplementalMaterial
  onDeleted: () => void
  onRefresh: () => void
}) {
  const viewUrl = `/api/supplemental-materials/view?materialId=${material.id}`
  const isPdf = isPdfMaterial(material)
  const uploadedDate = material.uploaded_at
    ? new Date(material.uploaded_at).toLocaleDateString('zh-CN')
    : null
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch('/api/supplemental-materials/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: material.id }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.message ?? '删除失败')
      toast.success('已删除')
      onDeleted()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-xl border border-border/50 bg-white/70 px-3 py-2.5 dark:border-white/6 dark:bg-white/[0.03]">
      {/* 顶行：缩略图 + 标题 + 操作按钮 */}
      <div className="flex items-center gap-3">
        {/* 缩略图 / 图标 */}
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/30 dark:border-white/6">
          {isPdf ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-0.5">
              <FileText className="h-5 w-5 text-muted-foreground/60" />
              <span className="text-[9px] font-medium text-muted-foreground/50">PDF</span>
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewUrl}
                alt={material.title ?? '截图'}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget
                  target.style.display = 'none'
                  const parent = target.parentElement
                  if (parent) {
                    const fallback = parent.querySelector('[data-fallback]') as HTMLElement | null
                    if (fallback) fallback.style.display = 'flex'
                  }
                }}
              />
              <div
                data-fallback
                className="absolute inset-0 hidden flex-col items-center justify-center gap-0.5"
              >
                <Image className="h-5 w-5 text-muted-foreground/50" />
              </div>
            </>
          )}
        </div>

        {/* 标题 + 日期 */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground/85">
            {material.title || (isPdf ? 'PDF 文件' : '截图')}
          </p>
          {uploadedDate && (
            <p className="text-[10px] text-muted-foreground">{uploadedDate}</p>
          )}
        </div>

        {/* 查看 + 删除按钮 */}
        <div className="flex shrink-0 items-center gap-1">
          <a href={viewUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-[11px]">
              <Eye className="mr-1 h-3 w-3" />
              查看
            </Button>
          </a>
          <Button
            variant="ghost"
            size="sm"
            disabled={deleting}
            onClick={handleDelete}
            className="h-7 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-red-500 dark:hover:text-red-400"
          >
            {deleting
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Trash2 className="h-3 w-3" />
            }
          </Button>
        </div>
      </div>

      {/* AI 提取结果 */}
      <ExtractionPanel material={material} onRefresh={onRefresh} />
    </div>
  )
}

/* ── 主面板 ──────────────────────────────────────────── */

export function DataImportPanel({ profileId, materials }: DataImportPanelProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [activeChannel, setActiveChannel] = useState<ImportChannel | null>(null)
  const [uploading, setUploading] = useState(false)

  const pdfMaterials = materials.filter(isPdfMaterial)
  const screenshotMaterials = materials.filter((m) => !isPdfMaterial(m))

  async function handleFiles(channel: ImportChannel, files: FileList | null) {
    if (!files?.length) return
    setUploading(true)

    try {
      let uploadedCount = 0
      for (const file of Array.from(files)) {
        const body = new FormData()
        body.set('profileId', profileId)
        body.set('kind', channel === 'pdf' ? 'document' : 'screenshot')
        body.set('file', file)
        body.set('title', file.name)

        const res = await fetch('/api/supplemental-materials', { method: 'POST', body })
        const payload = await res.json().catch(() => null)
        if (!res.ok || !payload?.success) {
          throw new Error(payload?.message || `上传 ${file.name} 失败`)
        }
        uploadedCount++
      }

      toast.success(`已上传 ${uploadedCount} 个文件，AI 正在读取内容…`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <section className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,253,0.94))] p-4 shadow-[0_22px_48px_-40px_rgba(15,23,42,0.14)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(15,21,32,0.94),rgba(10,15,22,0.96))] dark:shadow-[0_28px_64px_-42px_rgba(0,0,0,0.64)] md:p-5">
      <h3 className="mb-4 text-sm font-medium text-foreground/85">资料导入</h3>

      {/* 上传按钮区 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.entries(CHANNEL_META) as [ImportChannel, typeof CHANNEL_META[ImportChannel]][]).map(
          ([channel, meta]) => (
            <button
              key={channel}
              type="button"
              disabled={uploading}
              className="flex items-start gap-3 rounded-2xl border border-border/60 bg-white/80 px-4 py-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-50 dark:border-white/6 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              onClick={() => {
                setActiveChannel(channel)
                setTimeout(() => fileInputRef.current?.click(), 0)
              }}
            >
              <div className="mt-0.5 text-muted-foreground">
                {uploading && activeChannel === channel ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  meta.icon
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{meta.label}</p>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              </div>
            </button>
          )
        )}
      </div>

      {/* 已上传 PDF 列表 */}
      {pdfMaterials.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">
            PDF 文件 · {pdfMaterials.length} 份
          </p>
          <div className="space-y-2">
            {pdfMaterials.map((m) => (
              <MaterialItem
                key={m.id}
                material={m}
                onDeleted={() => router.refresh()}
                onRefresh={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}

      {/* 已上传截图列表 */}
      {screenshotMaterials.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">
            截图 · {screenshotMaterials.length} 份
          </p>
          <div className="space-y-2">
            {screenshotMaterials.map((m) => (
              <MaterialItem
                key={m.id}
                material={m}
                onDeleted={() => router.refresh()}
                onRefresh={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={activeChannel ? CHANNEL_META[activeChannel].accept : '*/*'}
        className="hidden"
        onChange={(e) => {
          if (activeChannel) handleFiles(activeChannel, e.target.files)
        }}
      />
    </section>
  )
}
