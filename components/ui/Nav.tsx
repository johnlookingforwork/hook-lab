'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className="h-12 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 gap-6 shrink-0 z-50">
      <Link href="/canvas" className="flex items-center gap-2 text-white font-bold text-base tracking-tight">
        <span className="text-yellow-400">⚗️</span>
        Hook Lab
      </Link>

      <div className="flex items-center gap-1 ml-2">
        <NavLink href="/canvas" active={pathname === '/canvas' || pathname?.startsWith('/test/')}>
          Canvas
        </NavLink>
        <NavLink href="/golden-folder" active={pathname === '/golden-folder'}>
          Golden Folder
        </NavLink>
      </div>
    </nav>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        active
          ? 'bg-zinc-800 text-white'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
      }`}
    >
      {children}
    </Link>
  )
}
