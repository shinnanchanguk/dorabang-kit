#!/usr/bin/env node
// npm run check: dist/ 의 파일을 도름스 서버와 같은 규칙으로 검사한다.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAnchors, checkEffect, checkPreview, checkRoom, sameRules, FEATURES } from "./lib/rules.js";
import { loadDormsEnv } from "./lib/env.js";

const DIST = resolve(fileURLToPath(new URL("..", import.meta.url)), "dist");
const read = (name) => existsSync(resolve(DIST, name)) ? new Uint8Array(readFileSync(resolve(DIST, name))) : null;

export function runCheck({ quiet = false } = {}) {
  const say = (line) => { if (!quiet) console.log(line); };
  const room = read("room.glb"), preview = read("preview.webp"), effect = read("effect.glb"), json = read("dorabang.json");
  if (!room || !preview || !json) {
    say("dist/ 에 room.glb · preview.webp · dorabang.json 이 없어요. npm run preview 화면에서 '저장'을 먼저 눌러 주세요.");
    return { ok: false };
  }
  let saved;
  try { saved = JSON.parse(new TextDecoder().decode(json)); } catch { say("dist/dorabang.json 을 읽지 못했어요. 다시 저장해 주세요."); return { ok: false }; }
  const anchors = saved.anchors, intro = typeof saved.intro === "string" ? saved.intro : "";
  let ok = true;
  const problems = checkAnchors(anchors);
  say("기능 자리:");
  for (const [key, label] of FEATURES) say(`  ${anchors && anchors[key] !== undefined ? "있음" : "없음"}  ${label}`);
  if (problems.length) { ok = false; for (const p of problems) say(`  고칠 것: ${p}`); }
  if (!problems.length) {
    const r = checkRoom(room, anchors);
    if (r.ok) say(`교실 꾸밈: 통과(면 ${r.triangles.toLocaleString("ko-KR")}개, ${(room.byteLength / 1024 / 1024).toFixed(2)}MB)`);
    else { ok = false; say(`교실 꾸밈: ${r.reason}`); }
  }
  const p = checkPreview(preview);
  if (p) { ok = false; say(`대표 그림: ${p}`); } else say("대표 그림: 통과");
  if (effect) {
    const e = checkEffect(effect);
    if (e.ok) say(`직접 만든 연출 모양: 통과(면 ${e.triangles}개)`); else { ok = false; say(`직접 만든 연출 모양: ${e.reason}`); }
  }
  if (intro.length > 80) { ok = false; say("소개 한 줄은 80자 이하여야 해요."); }
  say(ok ? "모두 통과했어요. npm run send 로 보낼 수 있어요." : "고칠 것이 있어요. 고친 뒤 미리보기에서 다시 저장하고 검사해 주세요.");
  return { ok, room, preview, effect, anchors, intro };
}

async function compareRemote() {
  try {
    const { origin } = loadDormsEnv({ needKey: false });
    const response = await fetch(`${origin}/api/school/dorabang/rules`, { redirect: "error", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return;
    if (!sameRules(await response.json())) console.log("알림: 도름스의 규칙이 이 도구와 달라요. 도름스에서 새 안내문을 받아 도구를 다시 시작해 주세요.");
  } catch { /* 연결이 안 되면 이 도구의 규칙으로만 검사한다 */ }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await compareRemote();
  const { ok } = runCheck();
  if (!ok) process.exitCode = 1;
}
