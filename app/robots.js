import config from '../site/config.json';
export const dynamic = 'force-static';
export default function robots() { return { rules: { userAgent: '*', allow: '/' }, sitemap: config.origin + '/sitemap.xml' }; }
