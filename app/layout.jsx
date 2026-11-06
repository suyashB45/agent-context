import './globals.css';
import './identity.css';
import { landingMeta, siteBrand } from '../site/src/content.js';
import config from '../site/config.json';

export const metadata = {
  metadataBase: new URL(config.origin),
  title: { default: landingMeta.title, template: '%s | Agent Context' },
  description: landingMeta.description,
  applicationName: siteBrand.name,
  openGraph: { title: landingMeta.ogTitle, description: landingMeta.ogDescription, type: 'website', url: config.origin, siteName: siteBrand.name },
  twitter: { card: 'summary_large_image', title: landingMeta.ogTitle, description: landingMeta.ogDescription },
  robots: { index: true, follow: true },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: landingMeta.themeColor };
const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem('agent-context-theme')==='light'?'light':'dark'}catch{}`;
export default function RootLayout({ children }) {
  return <html lang="en" data-theme="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><div id="root">{children}</div></body></html>;
}
