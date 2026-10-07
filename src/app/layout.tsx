import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import Navbar from "../components/Navbar";
import Providers from "../components/Providers";
import RouteSurface from "../components/RouteSurface";
import { THEME_BOOTSTRAP } from "../lib/theme";
import { publicSite } from "../lib/public-site";
const inter = localFont({
  src: "../../public/fonts/inter-latin.woff2",
  display: "swap",
  variable: "--font-inter",
  weight: "100 900",
});
export const metadata: Metadata = {
  title: {
    default: "Imagino — AI Creative Workspace",
    template: "%s · Imagino",
  },
  description:
    "Explore campaign visuals from your references. Choose your model, review the cost, and prepare your next variation.",
  icons: { icon: "/brand/favicon.svg" },
  metadataBase: publicSite(),
  openGraph: { title: "Imagino — AI Creative Workspace", description: "Create and organize AI visuals in your private workspace.", type: 'website' },
  twitter: { card: 'summary', title: "Imagino — AI Creative Workspace" },
  robots:
    publicSite() ? { index: true, follow: true } : { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head><script id="imagino-theme-init" dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} /></head>
      <body>
        <Providers>
          <a className="skip-link ui-button" href="#main-content">
            Skip to content
          </a>
          <Navbar />
          <div id="main-content" tabIndex={-1}>
            <RouteSurface>{children}</RouteSurface>
          </div>
        </Providers>
      </body>
    </html>
  );
}
