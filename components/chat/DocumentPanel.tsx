'use client'
import { useRef, useState } from 'react'
import { FileText, Upload, X, Loader2 } from 'lucide-react'
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
} from '@/hooks/useDocuments'
import { formatBytes, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  chatId: string
}

export function DocumentPanel({ chatId }: Props) {
  const { data, isLoading } = useDocuments(chatId)
  const upload = useUploadDocument(chatId)
  const remove = useDeleteDocument(chatId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = (files: File[]) => {
    for (const f of files) upload.mutate(f)
  }

  const docs = data?.documents ?? []

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Documents
        </span>
        <span className="text-xs text-muted-foreground">
          {docs.length} file{docs.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-150',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30',
        )}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(Array.from(e.dataTransfer.files))
        }}
      >
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.txt,.md,.csv,.json"
          onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
        />
        {upload.isPending ? (
          <div className="flex flex-col items-center gap-1">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Uploading…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Drop files or click to upload
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              PDF, TXT, MD, CSV, JSON
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length > 0 ? (
        <div className="flex flex-col gap-1">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 group transition-colors"
            >
              <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-medium text-foreground truncate">
                  {doc.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatBytes(doc.size)} · {formatDate(doc.created_at)}
                </span>
              </div>
              <button
                onClick={() => remove.mutate(doc.id)}
                disabled={remove.isPending}
                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Delete document"
              >
                {remove.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          No documents yet. Upload files to use as context.
        </p>
      )}
    </div>
  )
}
