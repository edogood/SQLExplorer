import Link from "next/link";
import { LESSON_CATALOG } from "../lib/catalog";

export default function Home() {
  return (
    <main>
      <h1>SQL Explorer - Catalogo</h1>
      <p>Versione GitHub Pages: contenuti statici + playground collegabile a un'API esterna.</p>
      <ul>
        {LESSON_CATALOG.map((l) => (
          <li key={l.id}>
            <Link href={`/lesson/${l.id}`}>{l.title}</Link> ({l.level})
          </li>
        ))}
      </ul>
    </main>
  );
}
