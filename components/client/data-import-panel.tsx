'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, FileUp, Image, FileText } from 'lucide-react'

interface DataImportPanelProps {
  profileId: string
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

export function DataImportPanel({ profileId }: DataImportPanelProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [activeChannel, setActiveChannel] = useState<ImportChannel | null>(null)
  const [uploading, setUploading] = useState(false)

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
