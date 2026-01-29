import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth, unauthorizedResponse } from '@/lib/auth-check'
import { getNurses, addNurse, deleteNurse } from '@/lib/admin-db'
import { revalidatePath } from 'next/cache'

export async function GET() {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return unauthorizedResponse()
    }
    
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
    
    await addNurse(name.trim())
    
    revalidatePath('/patients')
    revalidatePath('/admin/dashboard')
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Add nurse error:', error)
    
    if (error?.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'Nurse with this name already exists' },
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
    
    await deleteNurse(name)
    
    revalidatePath('/patients')
    revalidatePath('/admin/dashboard')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete nurse error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
