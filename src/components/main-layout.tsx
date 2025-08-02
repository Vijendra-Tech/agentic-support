'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Sidebar } from './sidebar'
import { SplitChatInterface } from './split-chat-interface'
import { Button } from '@/components/ui/button'
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  Sun,
  Moon,
} from 'lucide-react'

export function MainLayout() {
  const { sidebarOpen, setSidebarOpen, theme, setTheme } = useAppStore()
  const [activeTab, setActiveTab] = useState<'chat' | 'editor'>('chat')
  const [mounted, setMounted] = useState(false)
  const [fileTree, setFileTree] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
    // Fetch file tree on mount
    fetch('/api/file-tree')
      .then(res => res.json())
      .then(setFileTree)
      .catch(() => setFileTree([]))
  }, [])

  if (!mounted) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  // Removed handleSendMessage - letting SplitChatInterface handle mock responses internally

  return (
    <div className={`h-screen flex ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="flex-shrink-0">
          <Sidebar />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Minimal Top Bar */}
        <div className="flex items-center justify-between p-2 border-b bg-background/50">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleSidebar}
            className="h-8 w-8 p-0"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </Button>
          
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={toggleTheme} className="h-8 w-8 p-0">
              {theme === 'light' ? (
                <Moon className="w-3 h-3" />
              ) : (
                <Sun className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0">
          <SplitChatInterface />
        </div>


      </div>
    </div>
  )
}
