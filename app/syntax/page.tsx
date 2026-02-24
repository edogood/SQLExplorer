import { fetchLessons } from '@/lib/content';
export default async function SyntaxPage() {
  const lessons = await fetchLessons('syntax');
  return <main className="page"><h1>Sintassi SQL</h1>{lessons.map((l:any)=><article className="panel" key={l.id}><h2>{l.title}</h2><p>{l.body_md}</p></article>)}</main>;
}
