'use client'
import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Message } from '@/types'

interface Props {
  messages: Message[]
  streaming: boolean
  streamText: string
}

export function MessageList({ messages, streaming, streamText }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  return (
    <ScrollArea className="flex-1 w-full">
      <div className="max-w-3xl mx-auto pb-4 pt-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {streaming && messages.at(-1)?.role !== 'assistant' && (
          <div className="flex gap-3 px-4 py-3 animate-fade-in">
            <Avatar className="h-8 w-8 shrink-0 mt-0.5">
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-semibold">
                AI
              </AvatarFallback>
            </Avatar>
            <div className="rounded-2xl rounded-tl-sm px-4 py-2.5 bg-card border border-border text-sm max-w-[80%]">
              {streamText ? (
                <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {streamText}
                  <span className="inline-block w-0.5 h-4 bg-foreground/70 ml-0.5 animate-blink" />
                </p>
              ) : (
                <TypingIndicator />
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
