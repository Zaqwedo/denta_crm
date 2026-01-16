import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth, unauthorizedResponse } from '@/lib/auth-check'
import { getWhitelistEmails, addWhitelistEmail, deleteWhitelistEmail, updateWhitelistEmailDoctors } from '@/lib/admin-db'
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
    return NextResponse.json({ emails })
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
    
    const { email, provider, doctors } = await req.json()
    
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
    
    // Валидация doctors (массив строк)
    const doctorNames = Array.isArray(doctors) ? doctors.filter(d => typeof d === 'string' && d.trim()) : []
    
    await addWhitelistEmail(email.trim(), provider, doctorNames)
    
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
    
    const { email, doctors } = await req.json()
    
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }
    
    // Валидация doctors (массив строк)
    const doctorNames = Array.isArray(doctors) ? doctors.filter(d => typeof d === 'string' && d.trim()) : []
    
    await updateWhitelistEmailDoctors(email.trim(), doctorNames)
    
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
