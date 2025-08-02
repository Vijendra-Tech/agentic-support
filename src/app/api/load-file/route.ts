import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path')
  if (!filePath) {
    return new NextResponse('Missing file path', { status: 400 })
  }

  // Restrict file access to within the project directory for security
  const baseDir = path.join(process.cwd(), 'src')
  const absPath = path.join(baseDir, filePath.replace(/^\/+/, ''))
  if (!absPath.startsWith(baseDir)) {
    return new NextResponse('Invalid file path', { status: 400 })
  }

  try {
    const content = await fs.readFile(absPath, 'utf-8')
    return new NextResponse(content, { status: 200 })
  } catch (e) {
    return new NextResponse('File not found', { status: 404 })
  }
}
