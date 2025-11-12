import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PinkParties',
  description: 'Sistema de invitaciones con QR y control de aforo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
