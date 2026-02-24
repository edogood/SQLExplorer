import { notFound } from 'next/navigation';
import { fetchExercise } from '@/lib/content';

export default async function ExerciseDetail({ params }: { params: { id: string } }) {
  const exercise = await fetchExercise(Number(params.id));
  if (!exercise) return notFound();
  return <main className="page"><h1>{exercise.title}</h1><section className="panel"><p>{exercise.prompt_md}</p><pre>{exercise.starter_sql}</pre></section></main>;
}
