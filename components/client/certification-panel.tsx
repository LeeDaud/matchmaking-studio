'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Upload, CheckCircle2, XCircle, Clock, AlertTriangle, FileText } from 'lucide-react'
import {
  CERTIFICATION_TYPE_LABELS,
  CERTIFICATION_STATUS_LABELS,
  CERTIFICATION_DISPLAY_PRIORITY,
  type ProfileCertification,
} from '@/types/app'
import type { CertificationType, CertificationStatus } from '@/types/database'

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
        <Badge key={type} variant="default" className="text-[10px] px-1.5 py-0">
          <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
          {CERTIFICATION_TYPE_LABELS[type]}
        </Badge>
      ))}
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
      toast.success('认证材料已上传，等待审核')
      router.refresh()
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

      <div className="space-y-3">
        {ALL_CERT_TYPES.map((type) => {
          const cert = getCert(type)
          const status: CertificationStatus = cert?.status ?? 'not_submitted'
          const isUploading = uploadingType === type

          return (
            <div
              key={type}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-white/80 px-4 py-3 dark:border-white/6 dark:bg-white/[0.03]"
            >
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
                  {cert?.material_refs && cert.material_refs.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      已上传 {cert.material_refs.length} 份材料
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
              </div>
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
