'use client'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PROMPTS = [
  'Explain quantum computing in simple terms',
  'Write a Python script to parse CSV files',
  'What are the best practices for REST API design?',
  'Help me debug this React component',
  'Summarize the key ideas of stoicism',
  'Create a workout plan for beginners',
]

interface Props {
  onPrompt: (p: string) => void
}

export function EmptyState({ onPrompt }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-4 animate-fade-in">
      <div className="flex flex-col items-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          How can I help you today?
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a prompt below or type your own message
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            className="text-left px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all duration-150 text-sm text-muted-foreground hover:text-foreground active:scale-[0.98]"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
