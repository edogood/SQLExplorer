import { z } from "zod";

export const DialectSchema = z.enum(["postgres", "mysql", "sqlserver", "oracle"]);
export type Dialect = z.infer<typeof DialectSchema>;

export const LessonSchema = z.object({
  id: z.string(),
  title: z.string(),
  level: z.string(),
  tags: z.array(z.string()),
  description: z.string(),
  analogy: z.string(),
  mechanism: z.string(),
  edgeCases: z.array(z.string()),
  dataset: z.object({
    base: z.string(),
    patchSql: z.array(z.string())
  }),
  example: z.object({
    sql: z.string(),
    lineByLine: z.array(z.object({ line: z.number(), text: z.string(), why: z.string() }))
  }),
  exercises: z.array(z.object({
    id: z.string(),
    prompt: z.string(),
    hints: z.array(z.string()),
    solutionSql: z.string(),
    variants: z.array(z.string())
  })),
  autograde: z.object({
    compareMode: z.enum(["multiset", "ordered"]),
    expectedQuery: z.string(),
    tolerance: z.object({ floatAbs: z.number(), floatRel: z.number() }),
    forbiddenPatterns: z.array(z.string()),
    planChecks: z.array(z.object({ name: z.string(), dialect: z.string(), jsonPath: z.string(), assert: z.string() }))
  }),
  dialects: z.record(z.object({ sql: z.string(), notes: z.array(z.string()) }))
});
export type Lesson = z.infer<typeof LessonSchema>;

export type ExecuteResponse = {
  ok: boolean;
  columns?: { name: string; type: string }[];
  rows?: unknown[][];
  rowCount?: number;
  notices?: string[];
  plan?: unknown;
  profile?: unknown;
  error?: { message: string; code?: string; hint?: string; position?: number };
};
