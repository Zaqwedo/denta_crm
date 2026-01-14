import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiDir = path.join(process.cwd(), 'pages/api')
  
  try {
    const files: string[] = []
    
    function scanDir(dir: string, basePath: string = '') {
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        const relativePath = path.join(basePath, item)
        
        if (stat.isDirectory()) {
          scanDir(fullPath, relativePath)
        } else if (item.endsWith('.ts') || item.endsWith('.js')) {
          files.push(`/api/${relativePath.replace(/\.(ts|js)$/, '')}`)
        }
      }
    }
    
    scanDir(apiDir)
    
    res.status(200).json({
      message: 'API routes check',
      routes: files.sort(),
      googleCallbackExists: files.includes('/api/auth/google/callback'),
      googleIndexExists: files.includes('/api/auth/google'),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to scan routes',
      message: error instanceof Error ? error.message : String(error)
    })
  }
}
