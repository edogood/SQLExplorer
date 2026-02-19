import type { Dialect, Lesson } from "@sql-explorer/shared";

export type User = { id: string; email: string; passwordHash: string };
export type SandboxSession = {
  id: string;
  dialect: Extract<Dialect, "postgres" | "mysql">;
  lessonId: string;
  schema: string;
  expiresAt: string;
  connectionKey: string;
};

export type GradeRequest = {
  userId: string;
  lessonId: string;
  exerciseId: string;
  sessionId: string;
  sql: string;
};

export type AppState = {
  users: Map<string, User>;
  sessions: Map<string, SandboxSession>;
  progress: Map<string, { lessonId: string; passed: boolean; score: number }[]>;
  lessons: Lesson[];
};
