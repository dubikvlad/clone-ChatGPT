'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Square, Paperclip, ImageIcon, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatBytes } from '@/lib/utils'
import type { Attachment, AIModel } from '@/types'
import { MODEL_OPTIONS } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  onSend: (content: string, attachments?: Attachment[], model?: AIModel) => void
  onStop: () => void
  streaming: boolean
  disabled?: boolean
  defaultModel?: AIModel
}

export function ChatInput({
  onSend,
  onStop,
  streaming,
  disabled,
  defaultModel,
}: Props) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [model, setModel] = useState<AIModel>(
    defaultModel ?? 'claude-sonnet-4-20250514',
  )
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [text])

  const handleSend = () => {
    if ((!text.trim() && !attachments.length) || streaming || disabled) return
    onSend(text.trim(), attachments.length > 0 ? attachments : undefined, model)
    setText('')
    setAttachments([])
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader()
      reader.onload = () => res((reader.result as string).split(',')[1])
      reader.onerror = rej
      reader.readAsDataURL(file)
    })

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((res, rej) => {
      const reader = new FileReader()
      reader.onload = () => res(reader.result as string)
      reader.onerror = rej
      reader.readAsText(file)
    })

  const addFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      const isImage = file.type.startsWith('image/')
      if (isImage) {
        const data = await readFileAsBase64(file)
        setAttachments((p) => [
          ...p,
          {
            type: 'image',
            name: file.name,
            mimeType: file.type,
            size: file.size,
            data,
          },
        ])
      } else {
        const text = await readFileAsText(file).catch(() => '')
        const data = text.slice(0, 50_000) || undefined
        setAttachments((p) => [
          ...p,
          {
            type: 'document',
            name: file.name,
            mimeType: file.type,
            size: file.size,
            data,
          },
        ])
      }
    }
  }, [])

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items)
      const imageItems = items.filter((i) => i.type.startsWith('image/'))

      if (imageItems.length === 0) return
      e.preventDefault()

      const files = imageItems
        .map((i) => i.getAsFile())
        .filter(Boolean) as File[]
      await addFiles(files)
    },
    [addFiles],
  )

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      await addFiles(files)
    },
    [addFiles],
  )

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 py-3">
      <div className="max-w-3xl mx-auto">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((att, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-xs border border-border animate-fade-in"
              >
                {att.type === 'image' ? (
                  att.data ? (
                    <img
                      src={`data:${att.mimeType};base64,${att.data}`}
                      className="h-10 w-10 object-cover rounded-md"
                      alt={att.name}
                    />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  )
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex flex-col">
                  <span className="font-medium text-foreground max-w-[120px] truncate">
                    {att.name}
                  </span>
                  <span className="text-muted-foreground">
                    {formatBytes(att.size)}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setAttachments((p) => p.filter((_, j) => j !== i))
                  }
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            'relative flex flex-col gap-2 rounded-2xl border border-border bg-card shadow-sm transition-all duration-200',
            isDragging && 'ring-2 ring-primary border-primary bg-primary/5',
            disabled && 'opacity-60',
          )}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            onPaste={handlePaste}
            placeholder={
              isDragging
                ? 'Drop files here…'
                : 'Message… (Shift+Enter for newline, paste images)'
            }
            disabled={disabled || streaming}
            rows={1}
            className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed min-h-[44px] max-h-[200px] leading-relaxed"
          />

          <div className="flex items-center justify-between px-3 pb-2 gap-2">
            <div className="flex items-center gap-2">
              <Select
                value={model}
                onValueChange={(v) => setModel(v as AIModel)}
              >
                <SelectTrigger className="h-7 text-xs border-0 bg-muted hover:bg-muted/80 rounded-lg px-2 w-auto gap-1 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept="image/*,.txt,.md,.csv,.json"
                onChange={(e) => {
                  addFiles(Array.from(e.target.files ?? []))
                  e.target.value = ''
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>

            {streaming ? (
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-xl"
                onClick={onStop}
                title="Stop generating"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={handleSend}
                disabled={(!text.trim() && !attachments.length) || disabled}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-2">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}
