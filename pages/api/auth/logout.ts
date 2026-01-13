import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Удаляем куку аутентификации
  let cookieValue = `denta_auth=; HttpOnly; Path=/; Max-Age=0; SameSite=strict`
  if (process.env.NODE_ENV === 'production') {
    cookieValue += `; Secure`
  }

  res.setHeader('Set-Cookie', cookieValue)
  res.status(200).json({ success: true })
}