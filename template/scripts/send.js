#!/usr/bin/env node
// npm run send: 검사한 뒤 도름스에 보낸다. 파일은 도름스가 준 주소(저장소)에 바로 올리고, 다 올린 뒤 검사를 부탁한다.
import { runCheck } from "./check.js";
import { loadDormsEnv } from "./lib/env.js";
import { clean } from "./lib/clean.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function call(origin, key, body) {
  const response = await fetch(`${origin}/api/school/dorabang/versions`, {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body), redirect: "error", signal: AbortSignal.timeout(90_000),
  });
  return { response, body: await response.json().catch(() => ({})) };
}

async function main() {
  const { origin, key } = loadDormsEnv();
  const checked = runCheck({ quiet: true });
  if (!checked.ok) { runCheck(); process.exitCode = 1; console.log("검사를 통과하지 못해서 보내지 않았어요."); return; }
  const meta = { anchors: checked.anchors, intro: checked.intro };
  console.log("도름스에 보낼 준비를 하고 있어요.");
  let start;
  try { start = await call(origin, key, { step: "start", meta, effect: !!checked.effect }); }
  catch { process.exitCode = 1; console.log("도름스에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 보내 주세요."); return; }
  if (!start.response.ok || !UUID.test(start.body.id ?? "")) {
    process.exitCode = 1; console.log(`보내지 못했어요(${start.response.status}). ${clean(start.body.error, 300) || "잠시 후 다시 해 주세요."}`);
    if (start.response.status === 401) console.log("열쇠가 맞지 않거나 바뀌었어요. 도름스 '내 도라방'에서 안내문을 다시 받아 주세요.");
    return;
  }
  const files = [["room", checked.room, "model/gltf-binary"], ["preview", checked.preview, "image/webp"], ...(checked.effect ? [["effect", checked.effect, "model/gltf-binary"]] : [])];
  for (const [kind, bytes, type] of files) {
    const url = start.body.uploads?.[kind];
    if (typeof url !== "string" || !url.startsWith("https://") && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)) { process.exitCode = 1; console.log("올릴 주소를 받지 못했어요. 잠시 후 다시 보내 주세요."); return; }
    process.stdout.write(`  ${kind === "room" ? "교실 꾸밈" : kind === "preview" ? "대표 그림" : "연출 모양"} 올리는 중… `);
    const extra = start.body.uploadHeaders && typeof start.body.uploadHeaders.apikey === "string" ? { apikey: start.body.uploadHeaders.apikey } : {};
    const put = await fetch(url, { method: "PUT", headers: { "Content-Type": type, "x-upsert": "false", ...extra }, body: bytes, signal: AbortSignal.timeout(120_000) }).catch(() => null);
    if (!put?.ok) { process.exitCode = 1; console.log(`실패(${put?.status ?? "연결 끊김"}). 잠시 후 다시 보내 주세요.`); return; }
    console.log("끝");
  }
  const finish = await call(origin, key, { step: "finish", id: start.body.id, meta }).catch(() => null);
  if (!finish || !finish.response.ok) {
    process.exitCode = 1; console.log(`도름스가 받지 못했어요${finish ? `(${finish.response.status})` : ""}. ${clean(finish?.body.error, 300) || "잠시 후 다시 해 주세요."}`); return;
  }
  console.log(`보냈어요. ${finish.body.revision}번째 판이에요. 운영자가 확인하면 도름스 쪽지로 알려 드려요.`);
  console.log("고쳐 달라는 답이 오면 고친 뒤 다시 npm run send 로 보내면 돼요(기다리는 판은 새 판으로 바뀌어요).");
}

main().catch((error) => { process.exitCode = 1; console.log(error instanceof Error ? error.message : "알 수 없는 문제가 생겼어요."); });
