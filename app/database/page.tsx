import Link from 'next/link';
export default function DatabasePage() {
  return <main className="page"><h1>Database schema</h1><section className="panel"><p>Consulta lo schema runtime e le FK.</p><Link className="btn btn-primary" href="/api/schema">Apri JSON schema</Link></section></main>;
}
