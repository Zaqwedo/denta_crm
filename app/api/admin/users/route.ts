import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth, unauthorizedResponse } from '@/lib/auth-check'
import { getRegisteredUsers, deleteUser } from '@/lib/admin-db'
import { revalidatePath } from 'next/cache'

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await checkAdminAuth()
    if (!isAdmin) {
      return unauthorizedResponse()
    }
    
    const users = await getRegisteredUsers()
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get users error:', error)
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
    
    await deleteUser(email)
    
    revalidatePath('/admin/dashboard')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
