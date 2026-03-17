import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/ui/Nav'

export const metadata: Metadata = {
  title: 'Hook Lab',
  description: 'A/B testing workspace for short-form content creators',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 h-screen overflow-hidden flex flex-col">
        <Nav />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  )
}
