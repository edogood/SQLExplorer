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
  const [executionEnabled, setExecutionEnabled] = useState(false);

  useEffect(() => {
    if (!API_BASE) {
      setLesson({ id, title: id, description: "Modalità static-only: imposta NEXT_PUBLIC_API_BASE_URL per caricare API e sandbox." });
      return;
    }
    fetch(`${API_BASE}/api/content/lessons/${id}`).then((r) => r.json()).then(setLesson);
    fetch(`${API_BASE}/api/system/capabilities`)
      .then((r) => r.ok ? r.json() : { supportsExecution: false })
      .then((data) => setExecutionEnabled(Boolean(data.supportsExecution)))
      .catch(() => setExecutionEnabled(false));
  }, [id]);

  const run = async () => {
    if (!API_BASE) {
      setOutput({ ok: false, error: { message: "Execution disabled: API non configurata. Usa solutions/translation." } });
      return;
    }
    if (!executionEnabled) {
      setOutput({ ok: false, error: { message: "Execution disabled in this deployment. Avvia localmente API + docker sandbox per l'esecuzione reale." } });
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
      {!executionEnabled && <p><strong>Nota:</strong> Run SQL disabilitato in questa modalità di deploy.</p>}
      <CodeMirror value={query} height="200px" extensions={[sql()]} onChange={setQuery} />
      <button onClick={run}>Esegui</button>
      <pre>{JSON.stringify(output, null, 2)}</pre>
    </div>
  );
}
