import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Budget Tracker",
  description: "A secure budget tracking application with user authentication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('budget-tracker-theme') || 'light';
                const resolvedTheme = theme === 'system'
                  ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
                  : theme;
                
                // Remove any existing theme classes first
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(resolvedTheme);
                document.documentElement.setAttribute('data-theme', resolvedTheme);
                
                // Force immediate style application
                if (resolvedTheme === 'light') {
                  document.documentElement.style.backgroundColor = '#f9fafb';
                  document.body.style.backgroundColor = '#f9fafb';
                  document.documentElement.style.color = '#111827';
                  document.body.style.color = '#111827';
                } else {
                  document.documentElement.style.backgroundColor = '#0b0f1a';
                  document.body.style.backgroundColor = '#0b0f1a';
                  document.documentElement.style.color = '#f9fafb';
                  document.body.style.color = '#f9fafb';
                }
              } catch (e) {
                console.warn('Theme detection failed:', e);
                // Fallback to light mode
                document.documentElement.classList.add('light');
                document.documentElement.setAttribute('data-theme', 'light');
              }
            `
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <SessionProvider>
            <OnboardingTour>
              {children}
            </OnboardingTour>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
