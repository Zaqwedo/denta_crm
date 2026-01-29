import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth, unauthorizedResponse } from '@/lib/auth-check'
import { getWhitelistEmails, addWhitelistEmail, deleteWhitelistEmail, updateWhitelistEmailDoctors, updateWhitelistEmailNurses } from '@/lib/admin-db'
import { revalidatePath } from 'next/cache'

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider') as 'google' | 'yandex' | 'email' | null

    const emails = await getWhitelistEmails(provider || undefined)

    console.log('Admin whitelist API: возвращаем данные', {
      provider,
      emailsCount: emails.length,
      emails: emails.map(e => ({
        email: e.email,
        doctors: e.doctors,
        nurses: e.nurses,
        doctorsCount: e.doctors?.length || 0,
        nursesCount: e.nurses?.length || 0
      }))
    })

    return NextResponse.json({ emails }, {
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

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return unauthorizedResponse()
    }

    const { email, provider, doctors, nurses } = await req.json()

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!provider || !['google', 'yandex', 'email'].includes(provider)) {
      return NextResponse.json(
        { error: 'Valid provider (google, yandex, email) is required' },
        { status: 400 }
      )
    }

    // Простая валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Валидация doctors/nurses (массив строк)
    const doctorNames = Array.isArray(doctors) ? doctors.filter(d => typeof d === 'string' && d.trim()) : []
    const nurseNames = Array.isArray(nurses) ? nurses.filter(n => typeof n === 'string' && n.trim()) : []

    await addWhitelistEmail(email.trim(), provider, doctorNames, nurseNames)

    revalidatePath('/admin/dashboard')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Add whitelist email error:', error)

    if (error?.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'Email already exists in whitelist' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return unauthorizedResponse()
    }

    const { email, doctors, nurses } = await req.json()

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Валидация (массив строк)
    const doctorNames = Array.isArray(doctors) ? doctors.filter(d => typeof d === 'string' && d.trim()) : null
    const nurseNames = Array.isArray(nurses) ? nurses.filter(n => typeof n === 'string' && n.trim()) : null

    if (doctorNames !== null) {
      await updateWhitelistEmailDoctors(email.trim(), doctorNames)
    }

    if (nurseNames !== null) {
      await updateWhitelistEmailNurses(email.trim(), nurseNames)
    }

    revalidatePath('/admin/dashboard')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Update whitelist email doctors error:', error)

    if (error?.message === 'Email not found') {
      return NextResponse.json(
        { error: 'Email not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return unauthorizedResponse()
    }

    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    await deleteWhitelistEmail(email)

    revalidatePath('/admin/dashboard')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete whitelist email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
