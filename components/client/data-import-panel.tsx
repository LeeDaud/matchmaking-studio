'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, FileUp, Image, FileText, Eye, Trash2 } from 'lucide-react'
import type { SupplementalMaterial } from '@/types/database'

interface DataImportPanelProps {
  profileId: string
  materials: SupplementalMaterial[]
}

type ImportChannel = 'pdf' | 'screenshot'

const CHANNEL_META: Record<ImportChannel, { label: string; description: string; accept: string; icon: React.ReactNode }> = {
  pdf: {
    label: 'PDF 资料导入',
    description: '上传客户 PDF 格式的个人资料，系统将保存文件供后续解析提取。',
    accept: '.pdf,application/pdf',
    icon: <FileText className="h-5 w-5" />,
  },
  screenshot: {
    label: '截图上传',
    description: '上传微信聊天截图、朋友圈截图等，系统将保存文件供红娘参考。',
    accept: 'image/*',
    icon: <Image className="h-5 w-5" />,
  },
}

function isPdfMaterial(material: SupplementalMaterial) {
  return (
    material.kind === 'document' ||
    (material.url?.toLowerCase().includes('.pdf') ?? false)
  )
}

function MaterialItem({ material, onDeleted }: { material: SupplementalMaterial; onDeleted: () => void }) {
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
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-white/70 px-3 py-2.5 dark:border-white/6 dark:bg-white/[0.03]">
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
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
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
  )
}

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

      toast.success(`已上传 ${uploadedCount} 个文件`)
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
          <div className="space-y-1.5">
            {pdfMaterials.map((m) => (
              <MaterialItem key={m.id} material={m} onDeleted={() => router.refresh()} />
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
          <div className="space-y-1.5">
            {screenshotMaterials.map((m) => (
              <MaterialItem key={m.id} material={m} onDeleted={() => router.refresh()} />
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
