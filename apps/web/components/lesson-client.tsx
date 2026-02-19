"use client";
import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type Lesson = { id: string; title: string; description: string };

export default function LessonClient({ id }: { id: string }) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [query, setQuery] = useState("SELECT * FROM orders LIMIT 5;");
  const [output, setOutput] = useState<any>(null);

  useEffect(() => {
    if (!API_BASE) {
      setLesson({ id, title: id, description: "Imposta NEXT_PUBLIC_API_BASE_URL per caricare i dettagli da API." });
      return;
    }
    fetch(`${API_BASE}/api/content/lessons/${id}`).then((r) => r.json()).then(setLesson);
  }, [id]);

  const run = async () => {
    if (!API_BASE) {
      setOutput({ ok: false, error: { message: "API non configurata. Imposta NEXT_PUBLIC_API_BASE_URL." } });
      return;
    }
    const session = await fetch(`${API_BASE}/api/sandbox/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dialect: "postgres", lessonId: id, seedMode: "fixed" })
    }).then((r) => r.json());

    const result = await fetch(`${API_BASE}/api/sandbox/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.sessionId, sql: query })
    }).then((r) => r.json());

    setOutput(result);
  };

  if (!lesson) return <p>Loading...</p>;
  return (
    <div>
      <h1>{lesson.title}</h1>
      <p>{lesson.description}</p>
      <CodeMirror value={query} height="200px" extensions={[sql()]} onChange={setQuery} />
      <button onClick={run}>Esegui</button>
      <pre>{JSON.stringify(output, null, 2)}</pre>
    </div>
  );
}
