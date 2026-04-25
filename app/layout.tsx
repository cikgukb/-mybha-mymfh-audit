import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MyBHA — Muslim Friendly Hospitality',
  description: 'MyBHA Muslim Friendly Hospitality Certification (MFHC) — Audit System by HQC Shariah Advisory',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
