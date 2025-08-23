import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import { FirebaseProvider } from '@/providers/firebase-provider';
import AppNavbar from '@/components/layout/navbar';
import AppFooter from '@/components/layout/footer';
import { ThemeProvider } from '@/providers/theme-provider';
import { Toaster } from 'sonner';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Squiggles',
  description: "Transforms your child's imaginative squiggles into fun, realistic images!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunito.variable} font-sans antialiased flex flex-col min-h-screen`}>
        <ThemeProvider>
          <FirebaseProvider>
            <AppNavbar />
            <main className="flex-grow container mx-auto px-4 py-8">
              {children}
            </main>
            <AppFooter />
            <Toaster
              position="top-center"
              richColors
              closeButton
              toastOptions={{
                style: {
                  background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                },
              }}
            />
          </FirebaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}