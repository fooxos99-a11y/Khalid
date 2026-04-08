import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Cairo, Readex_Pro } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ConfirmDialogProvider } from "@/hooks/use-confirm-dialog"
import { GlobalAdminModals } from '@/components/global-admin-modals'
import { NotificationPermissionPrompt } from "@/components/notification-permission-prompt"
import { NativeNotificationBridge } from "@/components/native-notification-bridge"
import { PwaRegistration } from "@/components/pwa-registration"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })
const cairo = Cairo({ subsets: ["arabic"], variable: "--font-cairo" })
const readexPro = Readex_Pro({ subsets: ["arabic", "latin"], variable: "--font-display" })

export const metadata: Metadata = {
  metadataBase: new URL("https://habiib.org"),
  title: "مجمع الملك خالد",
  generator: "v0.app",
  manifest: "/manifest.webmanifest",
  applicationName: "مجمع الملك خالد",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "مجمع الملك خالد",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: "/4321-transparent.png?v=3",
    icon: [
      { url: "/browser-tab-icon.png?v=3", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [
      { url: "/browser-tab-icon.png?v=3", type: "image/png", sizes: "512x512" },
    ],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3453a7",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head />
      <body className={`${cairo.className} ${readexPro.variable} antialiased`} suppressHydrationWarning>
        <PwaRegistration />
        <NativeNotificationBridge />
        <NotificationPermissionPrompt />
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        <GlobalAdminModals />
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
