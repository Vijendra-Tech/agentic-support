"use client"

import { useState } from "react"
import { ChevronRight, Folder, FileText, ChevronDown } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { cn } from "@/lib/utils"

// Accepts a file tree structure
interface FileNode {
  name: string
  path: string
  type: "file" | "directory"
  children?: FileNode[]
}

interface FileExplorerProps {
  tree: FileNode[]
}

export function FileExplorer({ tree }: FileExplorerProps) {
  const { openFile } = useAppStore()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const handleOpenFile = async (file: FileNode) => {
    const res = await fetch(`/api/load-file?path=${encodeURIComponent(file.path)}`)
    if (!res.ok) return
    const content = await res.text()
    openFile({
      id: file.path,
      name: file.name,
      path: file.path,
      content,
      language: file.name.split('.').pop() || "plaintext",
      isReadOnly: false,
      lastModified: new Date(),
    })
  }

  const renderTree = (node: FileNode, depth = 0) => {
    if (node.type === 'directory') {
      const isOpen = expanded[node.path]
      return (
        <div key={node.path} className="select-none">
          <div
            className={cn(
              "flex items-center cursor-pointer px-3 py-1.5 hover:bg-muted/50 dark:hover:bg-muted/30 rounded-md transition-colors",
              "text-sm font-medium text-foreground/90"
            )}
            style={{ paddingLeft: 8 + depth * 16 }}
            onClick={() => setExpanded((prev) => ({ ...prev, [node.path]: !isOpen }))}
          >
            {isOpen ? (
              <ChevronDown className="w-4 h-4 mr-1.5 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1.5 text-muted-foreground flex-shrink-0" />
            )}
            <Folder className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
            <span className="truncate">{node.name}</span>
          </div>
          {isOpen && (
            <div className="ml-2 border-l border-muted/30">
              {node.children?.map((child) => renderTree(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }
    
    return (
      <div
        key={node.path}
        className={cn(
          "flex items-center cursor-pointer px-3 py-1.5 hover:bg-muted/30 dark:hover:bg-muted/20 rounded-md transition-colors",
          "text-sm text-foreground/90 group"
        )}
        style={{ paddingLeft: 32 + depth * 16 }}
        onClick={() => handleOpenFile(node)}
      >
        <FileText className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0 group-hover:text-foreground" />
        <span className="truncate">{node.name}</span>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-background/0 py-2 pr-0">
      {tree && tree.length > 0 ? (
        <div className="space-y-1">
          {tree.map((node) => renderTree(node))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground px-3 py-2">
          No files found
        </div>
      )}
    </div>
  )
}
