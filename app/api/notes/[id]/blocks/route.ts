import { NextRequest, NextResponse } from 'next/server'

import { saveBlocks } from '@/lib/actions/notes'
import { validateSaveBlocks } from '@/lib/schema/notes'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/notes/[id]/blocks
 * Save/sync blocks for a note (bulk upsert)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const validation = validateSaveBlocks(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const result = await saveBlocks(id, validation.data)

    if (result.error) {
      const status =
        result.error === 'Authentication required'
          ? 401
          : result.error.includes('not found') ||
              result.error.includes('access denied')
            ? 404
            : 500
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      )
    }

    return NextResponse.json({ success: true, data: result.blocks })
  } catch (error) {
    console.error('Error in PUT /api/notes/[id]/blocks:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
