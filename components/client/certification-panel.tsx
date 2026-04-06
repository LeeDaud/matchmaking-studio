'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, Upload, CheckCircle2, XCircle, Clock, AlertTriangle,
  FileText, ChevronDown, ChevronUp, Sparkles, Check, Minus, Flag,
  RefreshCw, Eye, Trash2,
} from 'lucide-react'
import {
  CERTIFICATION_TYPE_LABELS,
  CERTIFICATION_STATUS_LABELS,
  CERTIFICATION_DISPLAY_PRIORITY,
  type ProfileCertification,
} from '@/types/app'
import type { CertificationType, CertificationStatus } from '@/types/database'
import type { CertificationExtractionResult, CertFieldComparison } from '@/lib/ai/certification-extraction'

/* ── 认证状态徽章 ─────────────────────────────────────────── */

const STATUS_VARIANT: Record<CertificationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  not_submitted: 'outline',
  pending_review: 'secondary',
  verified: 'default',
  rejected: 'destructive',
  expired: 'outline',
}

const STATUS_ICON: Record<CertificationStatus, React.ReactNode> = {
  not_submitted: null,
  pending_review: <Clock className="mr-1 h-3 w-3" />,
  verified: <CheckCircle2 className="mr-1 h-3 w-3" />,
  rejected: <XCircle className="mr-1 h-3 w-3" />,
  expired: <AlertTriangle className="mr-1 h-3 w-3" />,
}

export function CertificationBadge({ status }: { status: CertificationStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="text-xs">
      {STATUS_ICON[status]}
      {CERTIFICATION_STATUS_LABELS[status]}
    </Badge>
  )
}

/** 列表卡片用：最多展示 N 个已认证标签 */
export function CertificationTagList({
  certifications,
  max = 3,
}: {
  certifications: ProfileCertification[]
  max?: number
}) {
  const verified = certifications.filter((c) => c.status === 'verified')
  const sorted = CERTIFICATION_DISPLAY_PRIORITY
    .filter((type) => verified.some((c) => c.type === type))
    .slice(0, max)

  if (sorted.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {sorted.map((type) => (
        <Badge key={type} variant="default" className="px-1.5 py-0 text-[10px]">
          <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
          {CERTIFICATION_TYPE_LABELS[type]}
        </Badge>
      ))}
    </div>
  )
}

/* ── 已上传材料列表 ──────────────────────────────────────── */

function isPdfUrl(url: string) {
  return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf')
}

function MaterialList({ certId, refs, onRefresh }: { certId: string; refs: string[]; onRefresh: () => void }) {
  if (!refs.length) return null
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null)

  async function handleDelete(index: number) {
    setDeletingIndex(index)
    try {
      const res = await fetch('/api/certification-materials/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certId, index }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.message ?? '删除失败')
      toast.success('已删除')
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败')
    } finally {
      setDeletingIndex(null)
    }
  }

  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {refs.map((url, index) => {
        const viewUrl = `/api/certification-materials/view?certId=${certId}&index=${index}`
        const isPdf = isPdfUrl(url)
        const isDeleting = deletingIndex === index

        return (
          <div key={index} className="group relative">
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/30 transition-colors hover:border-primary/40 hover:bg-muted/50 dark:border-white/8 dark:bg-white/[0.03] dark:hover:border-primary/30"
              title={`查看第 ${index + 1} 份材料`}
            >
              {isPdf ? (
                <div className="flex flex-col items-center gap-0.5">
                  <FileText className="h-6 w-6 text-muted-foreground/60 group-hover:text-primary/70" />
                  <span className="text-[10px] text-muted-foreground/60 group-hover:text-primary/70">
                    PDF {index + 1}
                  </span>
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewUrl}
                    alt={`材料 ${index + 1}`}
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
                    <FileText className="h-6 w-6 text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground/60">{index + 1}</span>
                  </div>
                </>
              )}
              {/* hover 遮罩 */}
              <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-colors group-hover:bg-black/12 dark:group-hover:bg-black/30">
                <Eye className="h-4 w-4 text-white opacity-0 drop-shadow-sm transition-opacity group-hover:opacity-100" />
              </div>
            </a>

            {/* 删除按钮 — hover 时出现在右上角 */}
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => handleDelete(index)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-white text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:border-red-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:border-white/12 dark:bg-neutral-900 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              title="删除此材料"
            >
              {isDeleting
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <Trash2 className="h-3 w-3" />
              }
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ── AI 比对结果展示 ─────────────────────────────────────── */

const MATCH_CONFIG = {
  match: {
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
    label: '与档案一致',
    className: 'text-emerald-600 dark:text-emerald-400',
  },
  conflict: {
    icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
    label: '与档案不符',
    className: 'text-amber-600 dark:text-amber-400',
  },
  new_info: {
    icon: <Sparkles className="h-3.5 w-3.5 text-blue-500" />,
    label: '新信息',
    className: 'text-blue-600 dark:text-blue-400',
  },
  unreadable: {
    icon: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
    label: '未识别',
    className: 'text-muted-foreground',
  },
}

function FieldComparisonRow({
  item,
  certId,
  onActionDone,
}: {
  item: CertFieldComparison
  certId: string
  onActionDone: () => void
}) {
  const [acting, setActing] = useState<'adopt' | 'ignore' | 'flag' | null>(null)
  const appliedAction = item._action

  const config = MATCH_CONFIG[item.match]
  const canAct = (item.match === 'conflict' || item.match === 'new_info') && !appliedAction

  async function doAction(action: 'adopt' | 'ignore' | 'flag') {
    setActing(action)
    try {
      const res = await fetch('/api/certification-materials/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certId,
          fieldKey: item.field_key,
          materialValue: item.material_value,
          action,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.message ?? '操作失败')

      if (action === 'adopt') toast.success(`已采纳：${item.field_label}`)
      else if (action === 'flag') toast.success(`已标记存疑：${item.field_label}`)
      else toast.success(`已忽略：${item.field_label}`)

      onActionDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="flex items-start gap-3 border-b border-border/50 py-2.5 last:border-0 last:pb-0 first:pt-0 dark:border-white/5">
      {/* 状态图标 */}
      <div className="mt-0.5 shrink-0">{config.icon}</div>

      {/* 字段信息 */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-xs font-medium text-foreground/85">{item.field_label}</span>
          <span className={`text-[11px] ${config.className}`}>{config.label}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
          {item.material_value !== null && (
            <span className="text-foreground/70">
              材料：<span className="font-medium text-foreground">{item.material_value}</span>
            </span>
          )}
          {item.profile_value !== null && item.match !== 'match' && (
            <span className="text-muted-foreground">
              档案：{item.profile_value}
            </span>
          )}
          {item.note && (
            <span className="text-muted-foreground italic">{item.note}</span>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      {canAct && !appliedAction && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 rounded-lg px-2 text-[11px] text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
            disabled={acting !== null}
            onClick={() => doAction('adopt')}
            title="采纳材料值，写入档案"
          >
            {acting === 'adopt' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            <span className="ml-1">采纳</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 rounded-lg px-2 text-[11px] text-muted-foreground hover:bg-muted/50"
            disabled={acting !== null}
            onClick={() => doAction('ignore')}
            title="忽略此差异"
          >
            {acting === 'ignore' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Minus className="h-3 w-3" />}
            <span className="ml-1">忽略</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 rounded-lg px-2 text-[11px] text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
            disabled={acting !== null}
            onClick={() => doAction('flag')}
            title="标记存疑，人工复核"
          >
            {acting === 'flag' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Flag className="h-3 w-3" />}
            <span className="ml-1">存疑</span>
          </Button>
        </div>
      )}

      {/* 已操作标记 */}
      {appliedAction && (
        <span className="shrink-0 rounded-md border border-border/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {appliedAction === 'adopt' ? '已采纳' : appliedAction === 'flag' ? '已存疑' : '已忽略'}
        </span>
      )}
    </div>
  )
}

function ExtractionResultPanel({
  cert,
  onRefresh,
}: {
  cert: ProfileCertification
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  let extraction: CertificationExtractionResult | null = null
  let isExtractionError = false
  let isCancelled = false

  try {
    if (cert.review_notes) {
      const parsed = JSON.parse(cert.review_notes)
      if (parsed.extraction_cancelled) {
        isCancelled = true
      } else if (parsed.extraction_error) {
        isExtractionError = true
      } else if (parsed.field_comparisons) {
        extraction = parsed
      }
    }
  } catch {
    // review_notes 不是 JSON，可能是旧格式文本注释
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      const res = await fetch('/api/certification-materials/cancel-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certId: cert.id }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.message ?? '取消失败')
      toast.success('已取消 AI 提取')
      onRefresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '取消失败')
    } finally {
      setCancelling(false)
    }
  }

  // 已被取消
  if (isCancelled) {
    return (
      <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2 text-xs text-muted-foreground dark:bg-white/[0.02]">
        <Minus className="h-3.5 w-3.5 shrink-0" />
        <span>AI 提取已取消</span>
        <button
          className="ml-auto text-[11px] underline-offset-2 hover:underline"
          onClick={onRefresh}
        >
          刷新
        </button>
      </div>
    )
  }

  // 没有提取结果（刚上传、正在处理中）
  if (!extraction && !isExtractionError) {
    return (
      <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground dark:bg-white/[0.03]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/60" />
        <span>AI 正在读取材料内容…</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="text-[11px] underline-offset-2 hover:underline disabled:opacity-50"
            disabled={cancelling}
            onClick={handleCancel}
          >
            {cancelling ? <Loader2 className="inline h-3 w-3 animate-spin" /> : '取消'}
          </button>
          <button
            className="text-[11px] underline-offset-2 hover:underline"
            onClick={onRefresh}
          >
            刷新
          </button>
        </div>
      </div>
    )
  }

  if (isExtractionError) {
    return (
      <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-red-50/60 px-3 py-2 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        <span>AI 提取失败，请重新上传材料或手动核对</span>
        <button
          className="ml-auto text-[11px] underline-offset-2 hover:underline"
          onClick={onRefresh}
        >
          重试
        </button>
      </div>
    )
  }

  if (!extraction) return null

  const conflicts = extraction.field_comparisons.filter(
    (f) => (f.match === 'conflict' || f.match === 'new_info') && !f._action
  )
  const hasActionable = conflicts.length > 0

  return (
    <div className="mt-2.5 overflow-hidden rounded-xl border border-border/50 bg-white/60 dark:border-white/6 dark:bg-white/[0.025]">
      {/* 摘要行 */}
      <button
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        <span className="min-w-0 flex-1 truncate text-xs text-foreground/80">
          {extraction.document_summary}
        </span>
        {hasActionable && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            {conflicts.length} 项待处理
          </span>
        )}
        {!hasActionable && (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            全部一致
          </span>
        )}
        {expanded
          ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        }
      </button>

      {/* 详情列表 */}
      {expanded && (
        <div className="border-t border-border/50 px-3 py-2 dark:border-white/6">
          {(() => {
            const visibleItems = extraction.field_comparisons.filter((f) => f.match !== 'unreadable')
            if (visibleItems.length === 0) {
              return (
                <p className="py-2 text-[11px] text-muted-foreground">
                  未能从材料中识别出指定字段，请检查材料内容或手动录入
                </p>
              )
            }
            return visibleItems.map((item) => (
              <FieldComparisonRow
                key={item.field_key}
                item={item}
                certId={cert.id}
                onActionDone={onRefresh}
              />
            ))
          })()}
          {extraction.extra_observations.length > 0 && (
            <div className="mt-2 rounded-lg bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground">
              <span className="font-medium">其他观察：</span>
              {extraction.extra_observations.join('；')}
            </div>
          )}
          <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground/60">
            <span>提取时间：{new Date(extraction.extracted_at).toLocaleString('zh-CN')}</span>
            <button
              className="flex items-center gap-1 hover:text-muted-foreground"
              onClick={(e) => { e.stopPropagation(); onRefresh() }}
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

/* ── 认证详情面板（客户详情页用） ─────────────────────────── */

const ALL_CERT_TYPES: CertificationType[] = [
  'identity', 'education', 'income', 'assets', 'marital_history', 'health',
]

interface CertificationPanelProps {
  profileId: string
  certifications: ProfileCertification[]
}

export function CertificationPanel({ profileId, certifications }: CertificationPanelProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadingType, setUploadingType] = useState<CertificationType | null>(null)
  const [activeType, setActiveType] = useState<CertificationType | null>(null)

  function getCert(type: CertificationType) {
    return certifications.find((c) => c.type === type)
  }

  async function handleUpload(type: CertificationType, files: FileList | null) {
    if (!files?.length) return
    setUploadingType(type)

    try {
      for (const file of Array.from(files)) {
        const body = new FormData()
        body.set('profileId', profileId)
        body.set('certType', type)
        body.set('file', file)

        const res = await fetch('/api/certification-materials', { method: 'POST', body })
        const payload = await res.json().catch(() => null)
        if (!res.ok || !payload?.success) {
          throw new Error(payload?.message || '上传失败')
        }
      }
      toast.success('认证材料已上传，AI 正在读取内容…')
      // 稍等 2 秒再刷新，给 AI 提取一点处理时间
      setTimeout(() => router.refresh(), 2000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败')
    } finally {
      setUploadingType(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <section className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,249,253,0.94))] p-4 shadow-[0_22px_48px_-40px_rgba(15,23,42,0.14)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(15,21,32,0.94),rgba(10,15,22,0.96))] dark:shadow-[0_28px_64px_-42px_rgba(0,0,0,0.64)] md:p-5">
      <h3 className="mb-4 text-sm font-medium text-foreground/85">认证信息</h3>

      <div className="space-y-2">
        {ALL_CERT_TYPES.map((type) => {
          const cert = getCert(type)
          const status: CertificationStatus = cert?.status ?? 'not_submitted'
          const isUploading = uploadingType === type
          const showExtraction = !!cert && (status === 'pending_review' || status === 'verified' || status === 'rejected')

          return (
            <div
              key={type}
              className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 dark:border-white/6 dark:bg-white/[0.03]"
            >
              {/* 主行 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{CERTIFICATION_TYPE_LABELS[type]}</p>
                    {cert?.reviewed_at && status === 'verified' && (
                      <p className="text-xs text-muted-foreground">
                        认证于 {new Date(cert.reviewed_at).toLocaleDateString('zh-CN')}
                      </p>
                    )}
                    {cert?.rejection_reason && status === 'rejected' && (
                      <p className="text-xs text-red-500">
                        驳回原因：{cert.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CertificationBadge status={status} />
                  {(status === 'not_submitted' || status === 'rejected' || status === 'expired') && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploading}
                      onClick={() => {
                        setActiveType(type)
                        fileInputRef.current?.click()
                      }}
                    >
                      {isUploading ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="mr-1 h-3 w-3" />
                      )}
                      上传材料
                    </Button>
                  )}
                  {status === 'pending_review' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isUploading}
                      onClick={() => {
                        setActiveType(type)
                        fileInputRef.current?.click()
                      }}
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      补充材料
                    </Button>
                  )}
                </div>
              </div>

              {/* 已上传材料缩略图 */}
              {cert && cert.material_refs && cert.material_refs.length > 0 && (
                <MaterialList certId={cert.id} refs={cert.material_refs} onRefresh={() => router.refresh()} />
              )}

              {/* AI 提取结果 */}
              {showExtraction && cert && (
                <ExtractionResultPanel
                  cert={cert}
                  onRefresh={() => router.refresh()}
                />
              )}
            </div>
          )
        })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (activeType) handleUpload(activeType, e.target.files)
        }}
      />
    </section>
  )
}
