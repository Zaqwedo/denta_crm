import { NextRequest, NextResponse } from 'next/server'
import { getWhitelistEmails } from '@/lib/admin-db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider') as 'google' | 'yandex' | 'email' | null
    
    const emails = await getWhitelistEmails(provider || undefined)
    // Нормализуем email (lowercase, trim) для корректного сравнения
    const normalizedEmails = emails.map(e => (e.email || '').toLowerCase().trim()).filter(e => e)
    
    console.log('Whitelist API response:', {
      provider,
      rawEmails: emails.map(e => e.email),
      normalizedEmails,
      count: normalizedEmails.length
    })
    
    return NextResponse.json({ emails: normalizedEmails }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Get whitelist error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
