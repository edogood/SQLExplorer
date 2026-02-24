export default function PlaygroundPage() {
  return (
    <main className="page">
      <section className="panel embed-panel">
        <h1>Playground</h1>
        <iframe title="Legacy playground" src="/playground.html" className="legacy-frame" />
      </section>
    </main>
  );
}
