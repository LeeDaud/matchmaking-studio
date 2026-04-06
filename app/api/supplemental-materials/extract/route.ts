/**
 * POST /api/supplemental-materials/extract
 *
 * 内部 API，由上传成功后异步触发。
 * 下载材料文件，调用 AI 提取信息，写回 supplemental_materials.extraction_result。
 *
 * Body: { materialId, fileUrl, fileExtension, kind }
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { withSupabaseRetry } from '@/lib/supabase/retry'
import { extractFromSupplementalMaterial } from '@/lib/ai/supplemental-extraction'
import type { SupplementalMaterialKind } from '@/types/database'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET

function isAuthorized(request: Request): boolean {
  if (!INTERNAL_SECRET) return true
  const auth = request.headers.get('x-internal-secret')
  return auth === INTERNAL_SECRET
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ success: false, message: '未授权' }, { status: 401 })
  }

  let body: {
    materialId?: string
    fileUrl?: string
    fileExtension?: string
    kind?: string
  }

  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, message: '无效请求体' }, { status: 400 })
  }

  const { materialId, fileUrl, fileExtension, kind } = body

  if (!materialId || !fileUrl || !fileExtension || !kind) {
    return Response.json({ success: false, message: '缺少必要参数' }, { status: 400 })
  }

  const serviceRoleClient = createServiceRoleClient()

  // 标记为处理中
  await withSupabaseRetry(
    () => serviceRoleClient
      .from('supplemental_materials')
      .update({ extraction_status: 'processing' })
      .eq('id', materialId),
    { label: 'supplemental extract: mark processing' }
  )

  // 调用 AI 提取
  let extractionResult
  try {
    extractionResult = await extractFromSupplementalMaterial({
      materialId,
      kind: kind as SupplementalMaterialKind,
      fileUrl,
      fileExtension,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await withSupabaseRetry(
      () => serviceRoleClient
        .from('supplemental_materials')
        .update({
          extraction_status: 'failed',
          extraction_result: { error: message, failed_at: new Date().toISOString() } as any,
          extracted_at: new Date().toISOString(),
        })
        .eq('id', materialId),
      { label: 'supplemental extract: write error' }
    )

    return Response.json({ success: false, message: `AI 提取失败: ${message}` }, { status: 500 })
  }

  // 写入结果
  await withSupabaseRetry(
    () => serviceRoleClient
      .from('supplemental_materials')
      .update({
        extraction_result: extractionResult as any,
        extracted_at: extractionResult.extracted_at,
        extraction_status: 'done',
      })
      .eq('id', materialId),
    { label: 'supplemental extract: write result' }
  )

  return Response.json({ success: true, result: extractionResult })
}
