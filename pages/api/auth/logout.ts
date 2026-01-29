import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Удаляем куки аутентификации и email
  let cookieValue = `denta_auth=; HttpOnly; Path=/; Max-Age=0; SameSite=strict`
  let emailCookieValue = `denta_user_email=; HttpOnly; Path=/; Max-Age=0; SameSite=strict`
  if (process.env.NODE_ENV === 'production') {
    cookieValue += `; Secure`
    emailCookieValue += `; Secure`
  }

  res.setHeader('Set-Cookie', [cookieValue, emailCookieValue])
  res.status(200).json({ success: true })
}