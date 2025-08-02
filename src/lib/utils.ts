import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import moment from "moment"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | number): string {
  // Use moment to handle various date formats
  const momentDate = moment(date)
  
  // Check if the date is valid
  if (!momentDate.isValid()) {
    return 'Invalid Date'
  }
  
  try {
    // Format using moment for consistent results
    return momentDate.format('MMM D, YYYY, h:mm A')
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
}

export function getFileLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'sql': 'sql',
    'json': 'json',
    'xml': 'xml',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'md': 'markdown',
    'yaml': 'yaml',
    'yml': 'yaml',
  }
  return languageMap[ext || ''] || 'plaintext'
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
