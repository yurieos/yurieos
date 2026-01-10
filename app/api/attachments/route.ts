/**
 * Attachment Upload API Route
 *
 * POST /api/attachments - Upload a new attachment
 */

import { NextRequest, NextResponse } from 'next/server'

import { uploadAttachment } from '@/lib/actions/attachments'
import { isSupportedMimeType } from '@/lib/schema/attachment'

export async function POST(req: NextRequest) {
  try {
    // Parse JSON body
    const body = await req.json()

    const { data, mimeType, chatId, messageId, filename } = body

    // Validate required fields
    if (!data || typeof data !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid data field' },
        { status: 400 }
      )
    }

    if (!mimeType || typeof mimeType !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid mimeType field' },
        { status: 400 }
      )
    }

    if (!chatId || typeof chatId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid chatId field' },
        { status: 400 }
      )
    }

    if (!messageId || typeof messageId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid messageId field' },
        { status: 400 }
      )
    }

    // Validate MIME type
    if (!isSupportedMimeType(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      )
    }

    // Upload the attachment
    const result = await uploadAttachment({
      data,
      mimeType,
      chatId,
      messageId,
      filename: typeof filename === 'string' ? filename : undefined
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      attachment: result.attachment
    })
  } catch (error) {
    console.error('Attachment upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload attachment' },
      { status: 500 }
    )
  }
}
