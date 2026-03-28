'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  Check,
  X,
  LogIn,
  UserPlus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useChats,
  useCreateChat,
  useRenameChat,
  useDeleteChat,
} from '@/hooks/useChats'
import { useMe, useLogout } from '@/hooks/useAuth'
import { useRealtimeChats } from '@/hooks/useRealtimeChats'
import type { Chat } from '@/types'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const router = useRouter()
  const pathname = usePathname()

  const { data: meData } = useMe()
  const user = meData?.user
  const { data: chatsData, isLoading } = useChats()
  const chats = chatsData?.chats ?? []
  const createChat = useCreateChat()
  const renameChat = useRenameChat()
  const deleteChat = useDeleteChat()
  const logout = useLogout()

  useRealtimeChats()

  const handleNewChat = async () => {
    if (!user) {
      router.push('/login')
      return
    }
    const res = await createChat.mutateAsync({})
    router.push(`/chat/${res.chat.id}`)
  }

  const startEdit = (chat: Chat, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingId(chat.id)
    setEditTitle(chat.title)
  }

  const confirmEdit = async () => {
    if (!editingId || !editTitle.trim()) {
      setEditingId(null)
      return
    }
    await renameChat.mutateAsync({ chatId: editingId, title: editTitle.trim() })
    setEditingId(null)
  }

  const handleDelete = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await deleteChat.mutateAsync(chatId)
    if (pathname === `/chat/${chatId}`) router.push('/')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)

  const groups: { label: string; chats: Chat[] }[] = []
  const todayChats = chats.filter((c) => new Date(c.updated_at) >= today)
  const yestChats = chats.filter(
    (c) =>
      new Date(c.updated_at) >= yesterday && new Date(c.updated_at) < today,
  )
  const weekChats = chats.filter(
    (c) =>
      new Date(c.updated_at) >= lastWeek && new Date(c.updated_at) < yesterday,
  )
  const olderChats = chats.filter((c) => new Date(c.updated_at) < lastWeek)
  if (todayChats.length) groups.push({ label: 'Today', chats: todayChats })
  if (yestChats.length) groups.push({ label: 'Yesterday', chats: yestChats })
  if (weekChats.length)
    groups.push({ label: 'Previous 7 days', chats: weekChats })
  if (olderChats.length) groups.push({ label: 'Older', chats: olderChats })

  return (
    <>
      {!mobileOpen && (
        <button
          className="fixed top-3 left-3 z-40 md:hidden h-8 w-8 flex items-center justify-center rounded-lg bg-background border border-border shadow-sm hover:bg-accent transition-colors"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'flex flex-col h-full bg-sidebar border-r border-sidebar-border shrink-0',
          'fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:relative md:inset-auto md:z-auto md:translate-x-0 md:transition-[width]',
          collapsed ? 'md:w-14' : 'md:w-64',
        )}
      >
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="hidden md:flex absolute right-4 top-4 z-10 h-6 w-6 rounded-full border border-border bg-background items-center justify-center shadow-sm hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}

        <div
          className={cn(
            'flex items-center gap-2 p-3 h-14',
            collapsed && 'justify-center',
          )}
        >
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="group h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm hover:from-violet-600 hover:to-indigo-700 transition-all"
            >
              <MessageSquare className="h-4 w-4 text-white group-hover:hidden" />
              <ChevronRight className="h-4 w-4 text-white hidden group-hover:block" />
            </button>
          ) : (
            <>
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-foreground text-sm tracking-tight">
                Aria Chat
              </span>
            </>
          )}
        </div>

        <Separator />

        <div className={cn('p-2', collapsed && 'flex justify-center')}>
          <Button
            onClick={handleNewChat}
            disabled={createChat.isPending}
            variant="ghost"
            className={cn(
              'gap-2 transition-all',
              collapsed ? 'h-9 w-9 p-0' : 'w-full justify-start h-9',
            )}
          >
            {createChat.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Plus className="h-4 w-4 shrink-0" />
            )}
            {!collapsed && <span className="text-sm">New chat</span>}
          </Button>
        </div>

        <ScrollArea className="flex-1 px-1">
          {!collapsed &&
            (isLoading ? (
              <div className="flex flex-col gap-1 p-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-9 rounded-lg bg-muted/50 animate-pulse"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground">No chats yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Start a new conversation
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 py-2">
                {groups.map((group) => (
                  <div key={group.label}>
                    <p className="px-2 mb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                      {group.label}
                    </p>
                    {group.chats.map((chat) => (
                      <div key={chat.id} className="group relative">
                        {editingId === chat.id ? (
                          <div className="flex items-center gap-1 px-2 py-1">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmEdit()
                                if (e.key === 'Escape') setEditingId(null)
                              }}
                              className="h-7 text-xs"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0"
                              onClick={confirmEdit}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Link
                            href={`/chat/${chat.id}`}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all duration-100 hover:bg-sidebar-accent group',
                              pathname === `/chat/${chat.id}` &&
                                'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
                            )}
                          >
                            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="flex-1 truncate text-xs">
                              {chat.title}
                            </span>
                            <div className="flex items-center gap-0.5 shrink-0 invisible group-hover:visible">
                              <button
                                onClick={(e) => startEdit(chat, e)}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
                              >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </button>
                              <button
                                onClick={(e) => handleDelete(chat.id, e)}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </button>
                            </div>
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
        </ScrollArea>

        <Separator />

        <div className={cn('p-2', collapsed && 'flex justify-center')}>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex items-center gap-2 rounded-lg hover:bg-sidebar-accent transition-colors w-full text-left',
                    collapsed ? 'p-1.5 justify-center' : 'px-2 py-1.5',
                  )}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-white text-xs font-semibold">
                      {user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium text-foreground truncate">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {user.email}
                      </span>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout.mutate()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div
              className={cn(
                'flex gap-1',
                collapsed ? 'flex-col items-center' : 'flex-row',
              )}
            >
              <Button
                asChild
                variant="ghost"
                size={collapsed ? 'icon' : 'sm'}
                className={collapsed ? 'h-9 w-9' : 'flex-1 text-xs h-8'}
              >
                <Link href="/login">
                  <LogIn className="h-4 w-4" />
                  {!collapsed && 'Sign in'}
                </Link>
              </Button>
              <Button
                asChild
                size={collapsed ? 'icon' : 'sm'}
                className={collapsed ? 'h-9 w-9' : 'flex-1 text-xs h-8'}
              >
                <Link href="/register">
                  <UserPlus className="h-4 w-4" />
                  {!collapsed && 'Sign up'}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
