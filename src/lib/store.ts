import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { AppState, ChatSession, Message, Integration, File } from './types'
import { generateId } from './utils'

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentSession: null,
        sessions: [],
        isLoading: false,
        integrations: [],
        activeIntegration: null,
        selectedRepo: null, // Add selected repository state
        openFiles: [],
        activeFile: null,
        sidebarOpen: true,
        theme: 'light',

        // Chat actions
        createSession: (title: string) => {
          const newSession: ChatSession = {
            id: generateId(),
            title,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
              ticketType: 'L2',
              priority: 'medium',
              status: 'open',
              tags: [],
            },
          }
          
          set((state) => ({
            sessions: [newSession, ...state.sessions],
            currentSession: newSession,
          }))
        },

        updateSession: (sessionId: string, updates: Partial<ChatSession>) => {
          set((state) => ({
            sessions: state.sessions.map((session) =>
              session.id === sessionId
                ? { ...session, ...updates, updatedAt: new Date() }
                : session
            ),
            currentSession:
              state.currentSession?.id === sessionId
                ? { ...state.currentSession, ...updates, updatedAt: new Date() }
                : state.currentSession,
          }))
        },

        deleteSession: (sessionId: string) => {
          set((state) => ({
            sessions: state.sessions.filter((session) => session.id !== sessionId),
            currentSession:
              state.currentSession?.id === sessionId ? null : state.currentSession,
          }))
        },

        addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
          const newMessage: Message = {
            ...message,
            id: generateId(),
            timestamp: new Date(),
          }

          set((state) => {
            const updatedSessions = state.sessions.map((session) =>
              session.id === sessionId
                ? {
                    ...session,
                    messages: [...session.messages, newMessage],
                    updatedAt: new Date(),
                  }
                : session
            )

            return {
              sessions: updatedSessions,
              currentSession:
                state.currentSession?.id === sessionId
                  ? {
                      ...state.currentSession,
                      messages: [...state.currentSession.messages, newMessage],
                      updatedAt: new Date(),
                    }
                  : state.currentSession,
            }
          })
        },

        // Integration actions
        setActiveIntegration: (integration: Integration | null) => {
          set({ activeIntegration: integration })
        },

        addIntegration: (integration: Omit<Integration, 'id'>) => {
          const newIntegration: Integration = {
            ...integration,
            id: generateId(),
          }
          
          set((state) => ({
            integrations: [...state.integrations, newIntegration],
          }))
        },

        updateIntegration: (id: string, updates: Partial<Integration>) => {
          set((state) => ({
            integrations: state.integrations.map((integration) =>
              integration.id === id ? { ...integration, ...updates } : integration
            ),
          }))
        },

        removeIntegration: (id: string) => {
          set((state) => ({
            integrations: state.integrations.filter((integration) => integration.id !== id),
            activeIntegration:
              state.activeIntegration?.id === id ? null : state.activeIntegration,
          }))
        },

        // File actions
        openFile: (file: File) => {
          set((state) => {
            const isAlreadyOpen = state.openFiles.some((f) => f.id === file.id)
            if (isAlreadyOpen) {
              return { activeFile: file }
            }
            
            return {
              openFiles: [...state.openFiles, file],
              activeFile: file,
            }
          })
        },

        closeFile: (fileId: string) => {
          set((state) => {
            const updatedFiles = state.openFiles.filter((file) => file.id !== fileId)
            const wasActive = state.activeFile?.id === fileId
            
            return {
              openFiles: updatedFiles,
              activeFile: wasActive 
                ? updatedFiles.length > 0 
                  ? updatedFiles[updatedFiles.length - 1] 
                  : null
                : state.activeFile,
            }
          })
        },

        updateFile: (fileId: string, content: string) => {
          set((state) => ({
            openFiles: state.openFiles.map((file) =>
              file.id === fileId
                ? { ...file, content, lastModified: new Date() }
                : file
            ),
            activeFile:
              state.activeFile?.id === fileId
                ? { ...state.activeFile, content, lastModified: new Date() }
                : state.activeFile,
          }))
        },

        setActiveFile: (fileId: string) => {
          set((state) => ({
            activeFile: state.openFiles.find((file) => file.id === fileId) || null,
          }))
        },

        // UI actions
        setSidebarOpen: (open: boolean) => {
          set({ sidebarOpen: open })
        },

        setTheme(theme: 'light' | 'dark') {
          set({ theme })
        },
        
        // Repository actions
        setSelectedRepo(repoId: string | null) {
          set({ selectedRepo: repoId })
        },
      }),
      {
        name: 'agentic-support-storage',
        partialize: (state) => ({
          sessions: state.sessions,
          integrations: state.integrations,
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    {
      name: 'agentic-support-store',
    }
  )
)
