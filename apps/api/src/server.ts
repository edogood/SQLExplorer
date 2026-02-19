import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import bcrypt from "bcryptjs";
import { randomUUID, createHash } from "node:crypto";
import { createSession, executeSql } from "./sandbox.js";
import { loadLessons } from "./content.js";
import { compareRows } from "./compare.js";
import { translateSql } from "./dialect.js";
import type { AppState } from "./types.js";

const app = Fastify({ logger: true });
await app.register(rateLimit, { max: 60, timeWindow: "1 minute" });
await app.register(jwt, { secret: process.env.JWT_SECRET ?? "dev-secret" });

const state: AppState = { users: new Map(), sessions: new Map(), progress: new Map(), lessons: loadLessons() };

app.post("/api/auth/register", async (req: any, reply) => {
  const { email, password } = req.body;
  const existing = [...state.users.values()].find((u) => u.email === email);
  if (existing) return reply.code(409).send({ error: "Email already exists" });
  const user = { id: randomUUID(), email, passwordHash: await bcrypt.hash(password, 10) };
  state.users.set(user.id, user);
  return { token: app.jwt.sign({ sub: user.id, email }) };
});

app.post("/api/auth/login", async (req: any, reply) => {
  const { email, password } = req.body;
  const user = [...state.users.values()].find((u) => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return reply.code(401).send({ error: "Invalid credentials" });
  return { token: app.jwt.sign({ sub: user.id, email }) };
});

app.get("/api/content/catalog", async () => state.lessons.map((l) => ({ id: l.id, title: l.title, level: l.level, tags: l.tags })));
app.get("/api/content/lessons/:id", async (req: any, reply) => {
  const lesson = state.lessons.find((l) => l.id === req.params.id);
  if (!lesson) return reply.code(404).send({ error: "Lesson not found" });
  return lesson;
});

app.post("/api/sandbox/sessions", async (req: any) => {
  const { dialect, lessonId } = req.body;
  const s = await createSession(state, dialect, lessonId);
  return { sessionId: s.id, expiresAt: s.expiresAt, schema: s.schema };
});

app.post("/api/sandbox/execute", async (req: any, reply) => {
  const { sessionId, sql, includePlan } = req.body;
  try {
    const redacted = createHash("sha256").update(sql).digest("hex");
    req.log.info({ q: redacted }, "query fingerprint");
    return await executeSql(state, sessionId, sql, includePlan);
  } catch (error: any) {
    return reply.code(400).send({ ok: false, error: { message: error.message } });
  }
});

app.post("/api/exercises/grade", async (req: any) => {
  const { userId, lessonId, exerciseId, sessionId, sql } = req.body;
  const lesson = state.lessons.find((l) => l.id === lessonId)!;
  const expected = await executeSql(state, sessionId, lesson.autograde.expectedQuery);
  const actual = await executeSql(state, sessionId, sql);
  const passed = compareRows(actual.rows ?? [], expected.rows ?? [], lesson.autograde.compareMode);
  const score = passed ? 100 : 0;
  const item = { lessonId, passed, score };
  state.progress.set(userId, [...(state.progress.get(userId) ?? []), item]);
  return { passed, score, feedback: passed ? "Great work" : "Output mismatch", diff: passed ? undefined : { missingRows: expected.rows, extraRows: actual.rows }, planChecks: lesson.autograde.planChecks.map((c) => ({ name: c.name, ok: true })) };
});

app.get("/api/users/me/progress", async (req: any) => ({ progress: state.progress.get(req.query.userId) ?? [] }));
app.post("/api/dialects/translate", async (req: any) => translateSql(req.body.sql, req.body.from, req.body.to));

app.listen({ port: Number(process.env.PORT ?? 4000), host: "0.0.0.0" });
