import { notFound } from 'next/navigation';
import { DocsPage } from '../../../site/src/App.jsx';
import { docs } from '../../../site/src/docs-content.js';

export const dynamicParams = false;
export function generateStaticParams() { return docs.map((doc) => ({ slug: doc.id === 'overview' ? [] : [doc.id] })); }
export async function generateMetadata({ params }) {
  const { slug = [] } = await params;
  const doc = docs.find((item) => item.id === (slug[0] || 'overview'));
  if (!doc || slug.length > 1) return {};
  return { title: doc.id === 'overview' ? 'Documentation' : doc.title, description: doc.subtitle, alternates: { canonical: doc.href }, openGraph: { title: doc.title, description: doc.subtitle, url: doc.href } };
}
export default async function Page({ params }) {
  const { slug = [] } = await params;
  const page = slug[0] || 'overview';
  if (slug.length > 1 || !docs.some((item) => item.id === page)) notFound();
  return <DocsPage page={page} />;
}
