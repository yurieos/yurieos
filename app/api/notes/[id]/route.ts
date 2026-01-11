import { NextRequest, NextResponse } from 'next/server'

import { deleteNote, getNote, updateNote } from '@/lib/actions/notes'
import { validateUpdateNote } from '@/lib/schema/notes'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/notes/[id]
 * Get a single note with its blocks
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const result = await getNote(id)

    if (result.error) {
      const status =
        result.error === 'Authentication required'
          ? 401
          : result.error === 'Note not found'
            ? 404
            : 500
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      )
    }

    return NextResponse.json({ success: true, data: result.note })
  } catch (error) {
    console.error('Error in GET /api/notes/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notes/[id]
 * Update a note
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const validation = validateUpdateNote(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const result = await updateNote(id, validation.data)

    if (result.error) {
      const status =
        result.error === 'Authentication required'
          ? 401
          : result.error.includes('not found')
            ? 404
            : 500
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      )
    }

    return NextResponse.json({ success: true, data: result.note })
  } catch (error) {
    console.error('Error in PATCH /api/notes/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notes/[id]
 * Delete a note permanently
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const result = await deleteNote(id)

    if (result.error) {
      const status = result.error === 'Authentication required' ? 401 : 500
      return NextResponse.json(
        { success: false, error: result.error },
        { status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/notes/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
