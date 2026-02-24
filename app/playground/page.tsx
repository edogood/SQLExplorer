import { PlaygroundClient } from '@/components/PlaygroundClient';

export default function PlaygroundPage() {
  return <main className="page"><PlaygroundClient starterSql="SELECT 1 AS ok" /></main>;
}
