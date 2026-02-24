import Link from 'next/link';
import { fetchExercises } from '@/lib/content';
export default async function ExercisesPage() {
  const exercises = await fetchExercises();
  return <main className="page"><h1>Esercizi</h1>{exercises.map((e:any)=><Link className="panel" href={`/exercises/${e.id}`} key={e.id}><h2>{e.title}</h2><p>{e.prompt_md}</p></Link>)}</main>;
}
