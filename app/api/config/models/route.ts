import { NextResponse } from 'next/server'

import { getModels } from '@/lib/config/models'

export function GET() {
  const models = getModels()

  return NextResponse.json(
    { models },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300', // Cache for 5 minutes
        'Content-Type': 'application/json'
      }
    }
  )
}
