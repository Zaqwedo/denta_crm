import { NextResponse } from 'next/server'
import { getNurses } from '@/lib/admin-db'

export async function GET() {
  try {
    const nurses = await getNurses()
    return NextResponse.json({ nurses })
  } catch (error) {
    console.error('Get nurses error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
