import { NextRequest, NextResponse } from 'next/server'

import { createNote, getNotes } from '@/lib/actions/notes'
import { validateCreateNote } from '@/lib/schema/notes'

/**
 * GET /api/notes
 * Get all notes for the current user
 */
export async function GET() {
  try {
    const result = await getNotes()

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === 'Authentication required' ? 401 : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        notes: result.notes,
        favorites: result.favorites
      }
    })
  } catch (error) {
    console.error('Error in GET /api/notes:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notes
 * Create a new note
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const validation = validateCreateNote(body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const result = await createNote(validation.data)

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === 'Authentication required' ? 401 : 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: result.note },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/notes:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
