/**
 * Attachment URL API Route
 *
 * GET /api/attachments/[id] - Get signed URL for an attachment
 */

import { NextRequest, NextResponse } from 'next/server'

import { getAttachmentUrl } from '@/lib/actions/attachments'

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const attachmentId = params.id

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(attachmentId)) {
      return NextResponse.json(
        { error: 'Invalid attachment ID' },
        { status: 400 }
      )
    }

    // Get signed URL
    const result = await getAttachmentUrl(attachmentId)

    if (!result.success) {
      const status = result.error === 'Attachment not found' ? 404 : 400
      return NextResponse.json(
        { error: result.error },
        { status }
      )
    }

    return NextResponse.json({
      url: result.url
    })
  } catch (error) {
    console.error('Get attachment URL error:', error)
    return NextResponse.json(
      { error: 'Failed to get attachment URL' },
      { status: 500 }
    )
  }
}
