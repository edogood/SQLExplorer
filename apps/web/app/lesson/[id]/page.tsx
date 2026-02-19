"use client";
import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";

export default function LessonPage({ params }: { params: { id: string } }) {
  const [lesson, setLesson] = useState<any>(null);
  const [query, setQuery] = useState("SELECT * FROM orders LIMIT 5;");
  const [output, setOutput] = useState<any>(null);

  useEffect(() => { fetch(`http://localhost:4000/api/content/lessons/${params.id}`).then(r => r.json()).then(setLesson); }, [params.id]);

  const run = async () => {
    const session = await fetch("http://localhost:4000/api/sandbox/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dialect: "postgres", lessonId: params.id, seedMode: "fixed" }) }).then(r => r.json());
    const result = await fetch("http://localhost:4000/api/sandbox/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: session.sessionId, sql: query }) }).then(r => r.json());
    setOutput(result);
  };

  if (!lesson) return <p>Loading...</p>;
  return <div>
    <h1>{lesson.title}</h1>
    <p>{lesson.description}</p>
    <CodeMirror value={query} height="200px" extensions={[sql()]} onChange={setQuery} />
    <button onClick={run}>Esegui</button>
    <pre>{JSON.stringify(output, null, 2)}</pre>
  </div>;
}
