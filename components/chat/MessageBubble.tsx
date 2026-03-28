'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { FileText } from 'lucide-react'
import type { Message } from '@/types'

interface Props {
  message: Message
  isStreaming?: boolean
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="absolute right-2 top-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-zinc-400" />
      )}
    </button>
  )
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user'
  const atts = (message.attachments ?? []) as any[]
  const imageAtts = atts.filter((a) => a.type === 'image')
  const docAtts = atts.filter((a) => a.type === 'document')

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 group animate-fade-in',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback
          className={cn(
            'text-xs font-semibold',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white',
          )}
        >
          {isUser ? 'U' : 'AI'}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          'flex flex-col gap-2 max-w-[80%]',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        {imageAtts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {imageAtts.map((img, i) =>
              img.data ? (
                <img
                  key={i}
                  src={`data:${img.mimeType};base64,${img.data}`}
                  alt={img.name}
                  className="max-h-64 max-w-xs rounded-xl object-cover border border-border shadow-sm"
                />
              ) : img.url ? (
                <img
                  key={i}
                  src={img.url}
                  alt={img.name}
                  className="max-h-64 max-w-xs rounded-xl object-cover border border-border shadow-sm"
                />
              ) : null,
            )}
          </div>
        )}

        {docAtts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {docAtts.map((doc, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs max-w-[220px]"
              >
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate font-medium text-foreground">
                  {doc.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {(message.content || isStreaming) && (
          <div
            className={cn(
              'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
              isUser
                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                : 'bg-card border border-border text-foreground rounded-tl-sm',
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, className, children, ...props }: any) {
                      const inline = !className
                      const match = /language-(\w+)/.exec(className || '')
                      const codeText = String(children).replace(/\n$/, '')
                      if (!inline && match) {
                        return (
                          <div className="relative group/code my-3 rounded-xl overflow-hidden border border-white/10">
                            <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800 border-b border-white/10">
                              <span className="text-xs text-zinc-400 font-mono">
                                {match[1]}
                              </span>
                              <CopyButton text={codeText} />
                            </div>
                            <SyntaxHighlighter
                              style={oneDark as any}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                borderRadius: 0,
                                background: '#1c1c1e',
                                fontSize: '13px',
                              }}
                            >
                              {codeText}
                            </SyntaxHighlighter>
                          </div>
                        )
                      }
                      return (
                        <code
                          className="bg-muted px-1.5 py-0.5 rounded-md font-mono text-xs"
                          {...props}
                        >
                          {children}
                        </code>
                      )
                    },
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:no-underline"
                      >
                        {children}
                      </a>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-2">
                        <table className="w-full border-collapse text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-border px-3 py-1.5 bg-muted font-semibold text-left">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-border px-3 py-1.5">
                        {children}
                      </td>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-0.5 h-4 bg-foreground/70 ml-0.5 animate-blink" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
