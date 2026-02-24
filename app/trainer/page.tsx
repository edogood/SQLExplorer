import { fetchTrainerItems } from '@/lib/content';
export default async function TrainerPage() {
  const items = await fetchTrainerItems();
  return <main className="page"><h1>Trainer</h1>{items.map((i:any)=><article className="panel" key={i.id}><h2>Domanda {i.id}</h2><p>{i.question_md}</p><details><summary>Risposta</summary><p>{i.answer_md}</p></details></article>)}</main>;
}
