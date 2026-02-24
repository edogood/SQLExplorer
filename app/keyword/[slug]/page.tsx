import { notFound } from 'next/navigation';
import { fetchKeyword } from '@/lib/content';

export default async function KeywordDetail({ params }: { params: { slug: string } }) {
  const kw = await fetchKeyword(params.slug);
  if (!kw) return notFound();
  return <main className="page"><h1>{kw.name}</h1><section className="panel"><p>{kw.description_md}</p></section></main>;
}
