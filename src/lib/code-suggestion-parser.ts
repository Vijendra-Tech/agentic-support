/**
 * Utility to parse AI responses for code suggestions and file references
 */

export interface CodeSuggestion {
  filePath: string
  language: string
  originalCode?: string
  suggestedCode: string
  description?: string
  lineNumbers?: {
    start: number
    end: number
  }
}

export interface ParsedCodeSuggestions {
  suggestions: CodeSuggestion[]
  hasCodeSuggestions: boolean
}

/**
 * Parse AI response text to extract code suggestions and file references
 */
export function parseCodeSuggestions(responseText: string): ParsedCodeSuggestions {
  const suggestions: CodeSuggestion[] = []
  
  // Patterns to match code blocks with file references
  const codeBlockPatterns = [
    // Pattern: ```language filename
    /```(\w+)\s+([^\n]+)\n([\s\S]*?)```/g,
    // Pattern: ```language
    // // filename or path comment
    /```(\w+)\n(?:\/\/\s*([^\n]+)\n)?([\s\S]*?)```/g,
    // Pattern: File: path/to/file.ext
    // ```language
    /(?:File|Path):\s*([^\n]+)\n```(\w+)\n([\s\S]*?)```/g,
  ]
  
  // Additional patterns for file references
  const fileReferencePatterns = [
    // Pattern: "in file.ext" or "in /path/to/file.ext"
    /(?:in|file|update|modify|edit)\s+([^\s]+\.\w+)/gi,
    // Pattern: `/path/to/file.ext`
    /`([^`]+\.\w+)`/g,
    // Pattern: file paths in parentheses
    /\(([^)]+\.\w+)\)/g,
  ]
  
  // First, try to find explicit code blocks with file references
  codeBlockPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(responseText)) !== null) {
      const [fullMatch, language, filePath, code] = match
      
      if (filePath && code && language) {
        // Clean up the file path
        const cleanFilePath = filePath.trim().replace(/^[#\/\s]*/, '')
        
        // Skip if it's not a valid file path
        if (!cleanFilePath.includes('.') || cleanFilePath.length < 3) {
          continue
        }
        
        suggestions.push({
          filePath: cleanFilePath,
          language: language.toLowerCase(),
          suggestedCode: code.trim(),
          description: extractDescriptionNearCode(responseText, fullMatch)
        })
      }
    }
  })
  
  // If no explicit code blocks found, look for file references and nearby code
  if (suggestions.length === 0) {
    fileReferencePatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(responseText)) !== null) {
        const filePath = match[1]
        
        // Skip if it's not a valid file path
        if (!filePath.includes('.') || filePath.length < 3) {
          continue
        }
        
        // Look for code blocks near this file reference
        const nearbyCode = findNearbyCodeBlock(responseText, match.index)
        if (nearbyCode) {
          suggestions.push({
            filePath: filePath.trim(),
            language: getLanguageFromFilePath(filePath),
            suggestedCode: nearbyCode.code,
            description: nearbyCode.description
          })
        }
      }
    })
  }
  
  // Remove duplicates based on file path
  const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
    index === self.findIndex(s => s.filePath === suggestion.filePath)
  )
  
  return {
    suggestions: uniqueSuggestions,
    hasCodeSuggestions: uniqueSuggestions.length > 0
  }
}

/**
 * Extract description text near a code block
 */
function extractDescriptionNearCode(text: string, codeBlock: string): string {
  const codeIndex = text.indexOf(codeBlock)
  if (codeIndex === -1) return ''
  
  // Look for text before the code block (up to 200 characters)
  const beforeText = text.substring(Math.max(0, codeIndex - 200), codeIndex)
  const sentences = beforeText.split(/[.!?]/)
  const lastSentence = sentences[sentences.length - 1]?.trim()
  
  return lastSentence || ''
}

/**
 * Find code block near a file reference
 */
function findNearbyCodeBlock(text: string, referenceIndex: number): { code: string; description: string } | null {
  // Look for code blocks within 500 characters of the file reference
  const searchStart = Math.max(0, referenceIndex - 250)
  const searchEnd = Math.min(text.length, referenceIndex + 250)
  const searchText = text.substring(searchStart, searchEnd)
  
  const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g
  const match = codeBlockPattern.exec(searchText)
  
  if (match && match[2]) {
    return {
      code: match[2].trim(),
      description: extractDescriptionNearCode(text, match[0])
    }
  }
  
  return null
}

/**
 * Get programming language from file path
 */
function getLanguageFromFilePath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell'
  }
  
  return languageMap[ext || ''] || 'text'
}

/**
 * Check if a message contains code suggestions
 */
export function hasCodeSuggestions(text: string): boolean {
  // Quick check for code blocks
  if (text.includes('```')) return true
  
  // Check for common code suggestion phrases
  const codeIndicators = [
    'here\'s the code',
    'update the file',
    'modify the code',
    'change the following',
    'replace with',
    'add this code',
    'here\'s how to fix',
    'try this implementation'
  ]
  
  const lowerText = text.toLowerCase()
  return codeIndicators.some(indicator => lowerText.includes(indicator))
}
