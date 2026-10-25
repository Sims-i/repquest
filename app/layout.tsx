import React from 'react'
import type { Metadata, Viewport } from 'next'
import './styles.css'

const title = 'RepQuest — Earn Your Strength'
const description =
  'A motivating workout tracker where every completed exercise earns XP toward long-term fitness ranks.'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title,
  description,
  openGraph: { title, description },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
