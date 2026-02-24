import Link from 'next/link';

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <p className="kicker">SQLExplorer su Vercel</p>
        <h1>Hub Next.js + pagine legacy statiche</h1>
        <p className="hero-copy">Le pagine storiche sono ora pubblicate sotto /public e raggiungibili direttamente come file .html.</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Accesso rapido</h2>
        </div>
        <div className="link-grid">
          <Link className="btn btn-primary" href="/playground">/playground</Link>
          <Link className="btn btn-primary" href="/keywords">/keywords</Link>
          <Link className="btn btn-primary" href="/syntax">/syntax</Link>
          <Link className="btn btn-secondary" href="/playground.html">/playground.html</Link>
          <Link className="btn btn-secondary" href="/keyword.html">/keyword.html</Link>
          <Link className="btn btn-secondary" href="/syntax.html">/syntax.html</Link>
        </div>
      </section>
    </main>
  );
}
