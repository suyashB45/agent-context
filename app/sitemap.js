import config from '../site/config.json';
import { docs } from '../site/src/docs-content.js';
export const dynamic = 'force-static';
export default function sitemap() { return ['/', ...docs.map((doc) => doc.href)].map((path) => ({ url: config.origin + path })); }
