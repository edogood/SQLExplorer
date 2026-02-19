import LessonClient from "../../../components/lesson-client";
import { LESSON_CATALOG } from "../../../lib/catalog";

export function generateStaticParams() {
  return LESSON_CATALOG.map((lesson) => ({ id: lesson.id }));
}

export default function LessonPage({ params }: { params: { id: string } }) {
  return <LessonClient id={params.id} />;
}
