import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({ 
    message: 'Google OAuth files are deployed',
    timestamp: new Date().toISOString()
  })
}
