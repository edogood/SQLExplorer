'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type ExecuteResponse = {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  durationMs: number;
};

const DEFAULT_QUERY = `SELECT id, name, segment, country\nFROM customers\nORDER BY created_at DESC\nLIMIT 20;`;

export default function Home() {
  const [sessionId, setSessionId] = useState<string>('');
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [error, setError] = useState<string>('');

  const canRun = useMemo(() => sessionId.length > 0 && !loading, [sessionId, loading]);

  useEffect(() => {
    const stored = localStorage.getItem('sql-lab-session-id');
    if (stored) {
      setSessionId(stored);
      return;
    }
    void createSession();
  }, []);

  async function createSession() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-session', { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message ?? 'Errore creazione sessione');
      setSessionId(payload.sessionId);
      localStorage.setItem('sql-lab-session-id', payload.sessionId);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore inatteso');
    } finally {
      setLoading(false);
    }
  }

  async function resetSession() {
    if (!sessionId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reset-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload?.error?.message ?? 'Reset fallito');
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore inatteso');
    } finally {
      setLoading(false);
    }
  }

  async function runQuery(event: FormEvent) {
    event.preventDefault();
    if (!sessionId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, sql: query })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error?.message ?? 'Esecuzione fallita');
      setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore inatteso');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="kicker">Runtime PostgreSQL server-side</p>
        <h1>Playground focalizzato su esecuzione query</h1>
        <p className="hero-copy">Sessioni isolate per schema, timeout e limiti rigidi. UI mantenuta nel look & feel originale.</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>SQL Playground</h2>
          <p>Esegui query reali su PostgreSQL tramite API serverless.</p>
        </div>

        <div className="status-row">
          <span className="badge neutral">Engine: PostgreSQL</span>
          <span className="badge neutral">Timeout: 3000ms</span>
          <span className="badge neutral">Max rows: 500</span>
          <span className="badge neutral">Sessione: {sessionId || 'creazione...'}</span>
        </div>

        <form className="playground-grid simple-grid" onSubmit={runQuery}>
          <div className="editor-panel">
            <label htmlFor="queryInput">Query editor</label>
            <textarea id="queryInput" spellCheck={false} rows={14} value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="controls-row">
              <button className="btn btn-primary" type="submit" disabled={!canRun}>Esegui query</button>
              <button className="btn btn-secondary" type="button" onClick={() => void createSession()} disabled={loading}>New Session</button>
              <button className="btn btn-secondary" type="button" onClick={() => void resetSession()} disabled={!sessionId || loading}>Reset Session</button>
            </div>
            {error ? <p className="error-text">{error}</p> : null}
          </div>

          <div className="result-panel">
            <h3>Risultato</h3>
            <div className="result-container">
              {!result ? (
                <p className="placeholder">Nessun risultato.</p>
              ) : (
                <>
                  <p className="query-meta">Rows: {result.rowCount} · Duration: {result.durationMs}ms</p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>{result.columns.map((col) => <th key={col}>{col}</th>)}</tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row, idx) => (
                          <tr key={idx}>
                            {row.map((cell, i) => <td key={`${idx}-${i}`}>{String(cell ?? 'NULL')}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
