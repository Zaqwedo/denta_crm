import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth, unauthorizedResponse } from '@/lib/auth-check'
import { getDoctors, addDoctor, deleteDoctor } from '@/lib/admin-db'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return unauthorizedResponse()
    }
    
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

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return unauthorizedResponse()
    }
    
    const { name } = await req.json()
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }
    
    await addDoctor(name.trim())
    
    revalidatePath('/patients')
    revalidatePath('/admin/dashboard')
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Add doctor error:', error)
    
    if (error?.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'Doctor with this name already exists' },
        { status: 409 }
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
    const name = searchParams.get('name')
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }
    
    await deleteDoctor(name)
    
    revalidatePath('/patients')
    revalidatePath('/admin/dashboard')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete doctor error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
