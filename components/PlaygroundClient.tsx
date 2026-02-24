'use client';
import { useEffect, useRef, useState } from 'react';

type ExecResult = { columns: string[]; rows: unknown[][]; rowCount: number; durationMs: number };

export function PlaygroundClient({ starterSql }: { starterSql: string }) {
  const [sessionId, setSessionId] = useState('');
  const [sql, setSql] = useState(starterSql);
  const [result, setResult] = useState<ExecResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    createSession();
  }, []);

  async function createSession() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-session', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? 'Cannot create session');
      setSessionId(data.sessionId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function execute() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, sql })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`${data.error?.code}: ${data.error?.message}`);
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <h1>Playground SQL</h1>
      <p className="muted">Ctrl+Enter per eseguire.</p>
      <div aria-live="polite" className="error-text">{error}</div>
      <div className="playground-grid">
        <div>
          <label htmlFor="sql">Query SQL</label>
          <textarea
            id="sql"
            ref={editorRef}
            value={sql}
            rows={12}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === 'Enter') execute();
            }}
          />
          <div className="controls-row">
            <button className="btn btn-primary" onClick={execute} disabled={loading || !sessionId}>Esegui</button>
            <button className="btn btn-secondary" onClick={createSession} disabled={loading}>Nuova sessione</button>
          </div>
        </div>
        <div className="result-panel">
          <h2>Risultati</h2>
          <div className="result-container table-wrap">
            {!result ? <p>Nessun risultato.</p> : (
              <table>
                <thead><tr>{result.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {result.rows.map((r, i) => <tr key={i}>{r.map((v, idx) => <td key={idx}>{String(v)}</td>)}</tr>)}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
