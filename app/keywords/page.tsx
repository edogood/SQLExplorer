import Link from 'next/link';
import { fetchKeywords } from '@/lib/content';
export default async function KeywordsPage() {
  const keywords = await fetchKeywords();
  return <main className="page"><h1>Keywords</h1><div className="link-grid">{keywords.map((k:any)=><Link key={k.slug} href={`/keyword/${k.slug}`} className="panel"><strong>{k.name}</strong><p>{k.category}</p></Link>)}</div></main>;
}
