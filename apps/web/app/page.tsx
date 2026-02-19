import Link from "next/link";

async function getCatalog() {
  const res = await fetch("http://localhost:4000/api/content/catalog", { cache: "no-store" });
  return res.json();
}

export default async function Home() {
  const lessons = await getCatalog().catch(() => []);
  return (
    <main>
      <h1>SQL Explorer - Catalogo</h1>
      <ul>
        {lessons.map((l: any) => <li key={l.id}><Link href={`/lesson/${l.id}`}>{l.title}</Link> ({l.level})</li>)}
      </ul>
    </main>
  );
}
