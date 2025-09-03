import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RAG Pipeline - Standalone Tool',
  description: 'Production-ready personal RAG system for Google Drive documents with semantic search capabilities',
  keywords: [
    'RAG',
    'semantic search',
    'document processing',
    'Google Drive',
    'vector database',
    'AI',
    'machine learning',
    'embeddings',
  ],
  authors: [{ name: 'RAG Pipeline Team' }],
  creator: 'RAG Pipeline',
  publisher: 'RAG Pipeline',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* Security headers via meta tags for client-side */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        
        {/* Prevent zoom on iOS */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
        >
          Skip to main content
        </a>
        
        {/* Main application */}
        <div className="relative flex min-h-screen flex-col">
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container-safe flex h-16 items-center justify-between">
              {/* Logo and title */}
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14,2 14,8 20,8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10,9 9,9 8,9" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-semibold">RAG Pipeline</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Standalone Document Processing
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex items-center space-x-2">
                <a
                  href="/"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent"
                >
                  Dashboard
                </a>
                <a
                  href="/setup"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent"
                >
                  Setup
                </a>
                <a
                  href="/logs"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-accent"
                >
                  Logs
                </a>
              </nav>

              {/* Status indicator */}
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex items-center space-x-1 text-xs text-muted-foreground">
                  <div className="status-dot-success" />
                  <span>System Online</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main id="main-content" className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container-safe flex h-12 items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span>RAG Pipeline v1.0</span>
                <span>•</span>
                <span>Production Ready</span>
              </div>
              <div className="flex items-center space-x-4">
                <a
                  href="https://github.com/your-repo/rag-pipeline"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
                <span>•</span>
                <a
                  href="/docs"
                  className="hover:text-foreground transition-colors"
                >
                  Documentation
                </a>
              </div>
            </div>
          </footer>
        </div>

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))',
            },
            success: {
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid rgb(34 197 94)',
              },
              iconTheme: {
                primary: 'rgb(34 197 94)',
                secondary: 'white',
              },
            },
            error: {
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid rgb(239 68 68)',
              },
              iconTheme: {
                primary: 'rgb(239 68 68)',
                secondary: 'white',
              },
            },
          }}
        />

        {/* Development tools (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 z-50">
            <details className="bg-background border rounded-lg shadow-lg">
              <summary className="px-3 py-2 text-xs font-medium cursor-pointer hover:bg-accent">
                Dev Tools
              </summary>
              <div className="p-3 border-t space-y-2 text-xs">
                <div>
                  <strong>Environment:</strong> {process.env.NODE_ENV}
                </div>
                <div>
                  <strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'Not set'}
                </div>
                <div>
                  <strong>WS URL:</strong> {process.env.NEXT_PUBLIC_WS_URL || 'Not set'}
                </div>
                <button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full px-2 py-1 bg-destructive text-destructive-foreground rounded text-xs hover:bg-destructive/90"
                >
                  Clear Storage & Reload
                </button>
              </div>
            </details>
          </div>
        )}

        {/* Accessibility announcements */}
        <div
          id="aria-live-region"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
      </body>
    </html>
  );
}