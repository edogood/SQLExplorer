import { fetchGuided } from '@/lib/content';
export default async function GuidedPage() {
  const steps = await fetchGuided();
  return <main className="page"><h1>Percorso guidato</h1>{steps.map((s:any)=><section className="panel" key={s.id}><h2>{s.title}</h2><p>{s.description_md}</p></section>)}</main>;
}
