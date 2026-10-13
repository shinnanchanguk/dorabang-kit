#!/usr/bin/env node
// npm run status: 내 도라방과 최근 판의 상태·운영자 메모.
import { loadDormsEnv } from "./lib/env.js";
import { clean } from "./lib/clean.js";

const LABEL = { pending: "확인 기다리는 중", approved: "열림", rejected: "열지 않기로 함", changes_requested: "고쳐 달라는 답", superseded: "새 판으로 바뀜", withdrawn: "거둠" };

async function main() {
  const { origin, key } = loadDormsEnv();
  const response = await fetch(`${origin}/api/school/dorabang/versions`, { headers: { Authorization: `Bearer ${key}` }, redirect: "error", signal: AbortSignal.timeout(30_000) }).catch(() => null);
  if (!response) { process.exitCode = 1; console.log("도름스에 연결하지 못했어요."); return; }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) { process.exitCode = 1; console.log(`읽지 못했어요(${response.status}). ${clean(body.error, 200)}`); return; }
  if (!body.room) { console.log("아직 보낸 도라방이 없어요."); return; }
  console.log(`${clean(body.room.title, 60)} · ${body.room.open ? "지금 열려 있어요" : "아직 열리지 않았어요"}`);
  for (const v of body.room.versions ?? []) {
    console.log(`  ${v.revision}번째 판: ${LABEL[v.status] ?? v.status}${v.note ? ` · 메모: ${clean(v.note, 300)}` : ""}`);
  }
}

main().catch(() => { process.exitCode = 1; console.log("알 수 없는 문제가 생겼어요."); });
