import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LessonSchema, type Lesson } from "@sql-explorer/shared";

export function loadLessons(): Lesson[] {
  const dir = resolve(process.cwd(), "content/lessons");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => LessonSchema.parse(JSON.parse(readFileSync(resolve(dir, file), "utf8"))));
}
