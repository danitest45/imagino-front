import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '../components/Navbar';
import Providers from '../components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Imagino.AI',
  description: 'Image generation with artificial intelligence',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-gray-950 text-white">
        <Providers>
          <Navbar />
          <div className="pt-20">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
