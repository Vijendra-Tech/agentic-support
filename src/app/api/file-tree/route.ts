import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

const IGNORED = ['node_modules', '.next', '.git', 'public', '.DS_Store', '.env', '.env.local', '.env.development.local', 'package-lock.json']

async function readDirRecursive(dir: string, base: string): Promise<FileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const nodes: FileNode[] = []
  for (const entry of entries) {
    if (IGNORED.includes(entry.name)) continue
    const fullPath = path.join(dir, entry.name)
    const relPath = path.relative(base, fullPath)
    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: relPath,
        type: 'directory',
        children: await readDirRecursive(fullPath, base),
      })
    } else {
      nodes.push({
        name: entry.name,
        path: relPath,
        type: 'file',
      })
    }
  }
  return nodes
}

export async function GET(req: NextRequest) {
  const baseDir = path.join(process.cwd(), 'src')
  try {
    const tree = await readDirRecursive(baseDir, baseDir)
    return NextResponse.json(tree)
  } catch (e) {
    return new NextResponse('Failed to read file tree', { status: 500 })
  }
}
