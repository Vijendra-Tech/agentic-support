import { NextRequest, NextResponse } from 'next/server'
import { IssueAnalysisService } from '@/lib/issue-analysis'

export async function POST(req: NextRequest) {
  try {
    const { statement } = await req.json()

    if (!statement || typeof statement !== 'string') {
      return NextResponse.json(
        { error: 'Statement is required and must be a string' },
        { status: 400 }
      )
    }

    const analysisService = new IssueAnalysisService()
    const analysis = await analysisService.analyzeUserStatement(statement)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error in analysis API:', error)
    return NextResponse.json(
      { 
        error: 'An error occurred while analyzing the statement',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
