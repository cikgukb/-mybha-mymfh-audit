import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MYBHA MyMFH Audit System',
  description: 'My Muslim Friendly Hotel Certification & Audit System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
