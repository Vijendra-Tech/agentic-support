import { openai } from '@ai-sdk/openai';
import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { IssueAnalysisService } from '@/lib/issue-analysis';
import { ServerCodeContextService } from '@/lib/server-code-context-service';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Removed edge runtime to support Dexie/IndexedDB for code context
// export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    let { messages }: { messages: UIMessage[] } = body;
    
    // Fix message format - convert parts-based messages to proper format
    messages = messages.map((message: any) => {
      if (message.parts && Array.isArray(message.parts)) {
        // Extract text content from parts
        const textParts = message.parts.filter((part: any) => part.type === 'text');
        const content = textParts.map((part: any) => part.text).join(' ');
        return {
          id: message.id,
          role: message.role,
          content,
          parts: [{ type: 'text', text: content }]
        } as UIMessage;
      }
      // Ensure message has proper structure
      return {
        id: message.id,
        role: message.role,
        content: message.content || '',
        parts: message.parts || [{ type: 'text', text: message.content || '' }]
      } as UIMessage;
    });
    
    console.log('Extracted messages:', messages);

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.log('Messages validation failed:', { messages, isArray: Array.isArray(messages), length: messages?.length });
      return new Response(
        JSON.stringify({ error: 'Messages array is required and must not be empty' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    try {
      // Get the latest user message for analysis
      const latestMessage = messages[messages.length - 1];
      let enhancedSystemPrompt = 'You are an intelligent L2/L3 Support Assistant specializing in technical troubleshooting, code analysis, and issue resolution. Provide clear, actionable, and technically accurate responses.';
      let analysisContext = '';

      // Analyze user statement for relevant issues and code suggestions
      if (latestMessage?.role === 'user') {
        const messageContent = (latestMessage as any)?.content;
        if (messageContent && typeof messageContent === 'string') {
          try {
            const analysisService = new IssueAnalysisService();
            const analysis = await analysisService.analyzeUserStatement(messageContent);
          
          if (analysis.confidence > 0.3) {
            // Include analysis results in the system prompt for better context
            analysisContext = `

CONTEXT FROM ISSUE ANALYSIS:
`;
            
            if (analysis.relevantIssues.length > 0) {
              analysisContext += `\nRelevant Issues Found:\n`;
              analysis.relevantIssues.forEach(issue => {
                analysisContext += `- ${issue.title} (${issue.repository}): ${issue.body.substring(0, 200)}...\n`;
              });
            }
            
            if (analysis.codeSuggestions.length > 0) {
              analysisContext += `\nCode Suggestions Available:\n`;
              analysis.codeSuggestions.forEach(suggestion => {
                analysisContext += `- ${suggestion.title}: ${suggestion.description}\n`;
              });
            }
            
            if (analysis.codeContexts && analysis.codeContexts.length > 0) {
              analysisContext += `\nRelevant Code Context from Repository:\n`;
              analysis.codeContexts.forEach(context => {
                analysisContext += `- ${context.fileName} (${context.repository}): ${context.contextType} - ${(context.relevanceScore * 100).toFixed(1)}% relevant\n`;
              });
            }
            
            analysisContext += `\nAnalysis Summary: ${analysis.summary}\nConfidence: ${(analysis.confidence * 100).toFixed(1)}%\n`;
            
            enhancedSystemPrompt += analysisContext;
            
            // Add detailed code context if available
            if (analysis.codeContexts && analysis.codeContexts.length > 0) {
              const serverCodeContextService = new ServerCodeContextService();
              const formattedCodeContext = serverCodeContextService.formatContextsForPrompt(analysis.codeContexts);
              enhancedSystemPrompt += `\n${formattedCodeContext}`;
            }
            
            enhancedSystemPrompt += `\n\nBased on this analysis and repository context, provide a comprehensive response that:\n1. Addresses the user's specific question or problem\n2. References relevant code files and their content when applicable\n3. Suggests concrete solutions and code improvements based on the actual repository structure\n4. Provides actionable next steps that are specific to their codebase\n5. Uses the provided code context to give precise, repository-aware recommendations\n\nWhen referencing code, use the actual file paths and content from the repository context above.`;
          }
          } catch (analysisError) {
            console.warn('Issue analysis failed:', analysisError);
            // Continue without analysis if it fails
          }
        }
      }

      // Use AI SDK's convertToModelMessages for proper message conversion
      console.log('Messages before conversion:', messages);
      const modelMessages = convertToModelMessages(messages);
      console.log('Converted model messages:', modelMessages);
      
      const result = await streamText({
        model: openai('gpt-4-turbo-preview'),
        messages: modelMessages,
        system: enhancedSystemPrompt,
        temperature: 0.7,
      });

      // Return the streaming response directly
      return result.toUIMessageStreamResponse();
      
    } catch (error) {
      console.error('Error in chat processing:', error);
      return new Response(
        JSON.stringify({
          error: 'An error occurred while processing your request',
          details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response(
      JSON.stringify({
        error: 'An error occurred while processing your request',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
