import { NextResponse } from 'next/server'
import { checkAuthAppRouter, unauthorizedResponse } from '@/lib/auth-check'

export async function GET() {
  // Проверка авторизации
  const isAuthenticated = await checkAuthAppRouter()
  
  if (!isAuthenticated) {
    return unauthorizedResponse()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return NextResponse.json({
    supabaseUrl: supabaseUrl 
      ? `${supabaseUrl.substring(0, 20)}... (length: ${supabaseUrl.length})` 
      : 'NOT SET',
    supabaseUrlStartsWithHttp: supabaseUrl?.startsWith('http') || false,
    supabaseAnonKey: supabaseAnonKey 
      ? `${supabaseAnonKey.substring(0, 20)}... (length: ${supabaseAnonKey.length})` 
      : 'NOT SET',
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseAnonKey: !!supabaseAnonKey,
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env)
      .filter(key => key.includes('SUPABASE'))
      .sort(),
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}