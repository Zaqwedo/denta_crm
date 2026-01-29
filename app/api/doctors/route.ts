import { NextResponse } from 'next/server'
import { getDoctors } from '@/lib/admin-db'

export async function GET() {
  try {
    const doctors = await getDoctors()
    return NextResponse.json({ doctors })
  } catch (error) {
    console.error('Get doctors error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
