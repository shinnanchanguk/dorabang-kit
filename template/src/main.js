// 도라방 미리보기: 교실을 둘러보고(둘러보기·걸어보기·위에서 보기), 기능 자리를 확인하고, 연출을 미리 보고, 저장한다.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildRoom, intro } from "./room.js";
import { buildEffect } from "./effect.js";
import { buildShell, LIGHT_PRESETS } from "./shell.js";
import { save, toGlb } from "./exportRoom.js";
import { FEATURES, ROOM, SPAWN, checkAnchors, checkEffect, checkPreview, checkRoom } from "../scripts/lib/rules.js";

const app = document.getElementById("app"), bar = document.getElementById("bar"), panel = document.getElementById("panel"), hint = document.getElementById("hint");
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 100);
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 1, -0.5); camera.position.set(3.6, 2.4, 3.2); orbit.update();

const hemi = new THREE.HemisphereLight(); const sun = new THREE.DirectionalLight(); sun.position.set(-3, 6, 4);
scene.add(hemi, sun, buildShell());

const { room, anchors } = buildRoom();
scene.add(room);
const effectShape = buildEffect();

// 기능 자리 표시(내보내지 않는다).
const overlay = new THREE.Group(); scene.add(overlay);
function drawOverlay() {
  overlay.clear();
  const marker = (pos, color, yaw) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 12), new THREE.MeshBasicMaterial({ color }));
    cone.position.set(pos[0], 0.95, pos[2]); cone.rotation.x = Math.PI; overlay.add(cone);
    if (yaw !== undefined) { const arrow = new THREE.ArrowHelper(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), new THREE.Vector3(pos[0], 0.08, pos[2]), 0.45, color); overlay.add(arrow); }
  };
  const outline = (p, color) => {
    if (!p) return;
    const geo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(p.width, p.height));
    const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color })); line.position.set(...p.center); line.position.z += Math.cos(p.yaw) * 0.02; line.rotation.y = p.yaw; overlay.add(line);
  };
  outline(anchors.screen, "#3b82f6"); outline(anchors.titleBoard, "#f59e0b"); outline(anchors.donation?.board, "#a855f7");
  if (anchors.presenter) marker(anchors.presenter.pos, "#ef4444", anchors.presenter.yaw);
  for (const s of anchors.mcSeats ?? []) marker(s.pos, "#f97316", s.yaw);
  for (const s of anchors.seats ?? []) marker(s.pos, "#22c55e", s.yaw);
  for (const [p, color] of [[anchors.attendance?.pos, "#eab308"], [anchors.donation?.pos, "#a855f7"]]) {
    if (!p) continue; const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color, wireframe: true })); ball.position.set(...p); overlay.add(ball);
  }
  const spawn = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 32), new THREE.MeshBasicMaterial({ color: "#64748b", side: THREE.DoubleSide }));
  spawn.rotation.x = -Math.PI / 2; spawn.position.set(SPAWN.x, 0.01, SPAWN.z); overlay.add(spawn);
}
drawOverlay();

// 조명.
let light = anchors.light ?? "warm";
function applyLight(name) {
  const p = LIGHT_PRESETS[name] ?? LIGHT_PRESETS.warm; light = name;
  hemi.color.set(p.hemi[0]); hemi.groundColor.set(p.hemi[1]); hemi.intensity = p.hemi[2];
  sun.color.set(p.sun[0]); sun.intensity = p.sun[1]; scene.background = new THREE.Color(p.bg);
}
applyLight(light);

// 걸어보기: 키보드(WASD·방향키)로 걷고 끌어서 둘러본다. 부딪힘은 부품 상자로 대략 잰다.
const boxes = []; room.updateMatrixWorld(true);
room.traverse((o) => { if (o.isMesh) { const b = new THREE.Box3().setFromObject(o); if (b.max.y > 0.05 && b.min.y < 1.6) boxes.push(b); } });
const walker = { x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw, pitch: 0 };
let mode = "orbit";
const keys = new Set();
addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
let drag = null;
renderer.domElement.addEventListener("pointerdown", (e) => { if (mode === "walk") drag = { x: e.clientX, y: e.clientY }; });
addEventListener("pointerup", () => { drag = null; });
addEventListener("pointermove", (e) => {
  if (!drag || mode !== "walk") return;
  walker.yaw -= (e.clientX - drag.x) * 0.005; walker.pitch = Math.max(-1, Math.min(1, walker.pitch - (e.clientY - drag.y) * 0.004));
  drag = { x: e.clientX, y: e.clientY };
});
const blocked = (x, z) => Math.abs(x) > ROOM.halfX - 0.25 || Math.abs(z) > ROOM.halfZ - 0.25 || boxes.some((b) => x > b.min.x - 0.22 && x < b.max.x + 0.22 && z > b.min.z - 0.22 && z < b.max.z + 0.22);

// 연출 미리 보기(도름스와 같은 네 가지 움직임).
const bursts = [];
function playEffect(kind, at) {
  const shape = effectShape ?? new THREE.Mesh(new THREE.TorusKnotGeometry(0.12, 0.04, 48, 6), new THREE.MeshStandardMaterial({ color: "#7aa7e0", emissive: "#3b5a86" }));
  for (let i = 0; i < 18; i++) {
    const m = shape.clone(); m.position.set(...at); scene.add(m);
    const a = (i / 18) * Math.PI * 2;
    bursts.push({ m, kind, a, t0: performance.now(), i });
  }
}
function stepEffects(now) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i]; const t = (now - b.t0) / 1000;
    if (t > 2.4) { scene.remove(b.m); bursts.splice(i, 1); continue; }
    const base = b.m.userData.base ?? (b.m.userData.base = b.m.position.clone());
    if (b.kind === "rain") b.m.position.set(base.x + Math.cos(b.a) * 1.6 * ((b.i % 5) / 5 + 0.2), base.y + 0.6 - t * 1.4, base.z + Math.sin(b.a) * 1.2 * ((b.i % 3) / 3 + 0.3));
    else if (b.kind === "burst") b.m.position.set(base.x + Math.cos(b.a) * t * 1.4, base.y + Math.sin(b.a * 2) * t * 0.6, base.z + Math.sin(b.a) * t * 1.4);
    else if (b.kind === "rise") b.m.position.set(base.x + Math.cos(b.a) * 0.5, base.y - 1.2 + t * 1.6 + (b.i % 4) * 0.1, base.z + Math.sin(b.a) * 0.5);
    else b.m.position.set(base.x + Math.cos(b.a + t * 3) * (0.3 + t * 0.4), base.y + Math.sin(t * 4 + b.i) * 0.2, base.z + Math.sin(b.a + t * 3) * (0.3 + t * 0.4));
    b.m.rotation.y = t * 3; b.m.scale.setScalar(Math.max(0.01, 1 - t / 2.4));
  }
}

// 단추.
function button(label, onClick, { pressed = null, cls = "" } = {}) {
  const el = document.createElement("button"); el.type = "button"; el.textContent = label; if (cls) el.className = cls;
  if (pressed !== null) el.setAttribute("aria-pressed", String(pressed));
  el.addEventListener("click", onClick); bar.appendChild(el); return el;
}
const modeButtons = {};
const setMode = (next) => {
  mode = next; orbit.enabled = next !== "walk";
  for (const [k, b] of Object.entries(modeButtons)) b.setAttribute("aria-pressed", String(k === next));
  if (next === "top") { camera.position.set(0, 12, 0.01); orbit.target.set(0, 0, 0); orbit.update(); }
  if (next === "orbit") { camera.position.set(3.6, 2.4, 3.2); orbit.target.set(0, 1, -0.5); orbit.update(); }
  if (next === "walk") { walker.x = SPAWN.x; walker.z = SPAWN.z; walker.yaw = SPAWN.yaw; walker.pitch = 0; }
  hint.textContent = next === "walk" ? "W·A·S·D 또는 방향키로 걷고, 화면을 끌어 둘러봐요. 출입문 안쪽에서 시작해요." : "끌어서 돌려 보고, 휠로 가까이 봐요.";
};
modeButtons.orbit = button("둘러보기", () => setMode("orbit"), { pressed: true });
modeButtons.walk = button("걸어보기", () => setMode("walk"), { pressed: false });
modeButtons.top = button("위에서 보기", () => setMode("top"), { pressed: false });
const lightButtons = {};
for (const [k, label] of [["day", "낮"], ["warm", "저녁"], ["night", "밤"]]) lightButtons[k] = button(label, () => { applyLight(k); for (const [n, b] of Object.entries(lightButtons)) b.setAttribute("aria-pressed", String(n === k)); }, { pressed: k === light });
let showMarks = true;
const markButton = button("자리 표시 끄기", () => { showMarks = !showMarks; overlay.visible = showMarks; markButton.textContent = showMarks ? "자리 표시 끄기" : "자리 표시 켜기"; });
button("출석 연출 보기", () => anchors.attendance && playEffect(anchors.attendance.effect, anchors.attendance.pos));
button("도름네이션 연출 보기", () => anchors.donation && playEffect(anchors.donation.effect, anchors.donation.pos));
button("저장", saveAll, { cls: "save" });
setMode("orbit");

function renderChecklist(extra = []) {
  const problems = checkAnchors(anchors);
  const items = FEATURES.map(([key, label]) => `<li class="${anchors[key] !== undefined ? "ok" : "no"}">${anchors[key] !== undefined ? "있음" : "없음"} · ${label}</li>`).join("");
  const seats = Array.isArray(anchors.seats) ? anchors.seats.length : 0;
  panel.innerHTML = `<h2>기능 자리</h2><ul>${items}</ul><p>청중 좌석 ${seats}석 · 조명 ${escapeHtml(({ day: "밝은 낮", warm: "따뜻한 저녁", night: "밤" })[light] ?? light)}</p>` +
    (problems.length || extra.length ? `<h2>고칠 것</h2><ul>${[...problems, ...extra].map((p) => `<li class="no">${escapeHtml(p)}</li>`).join("")}</ul>` : `<p class="ok">기능 자리는 모두 갖췄어요.</p>`);
}
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
renderChecklist();

async function saveAll() {
  const messages = [];
  try {
    overlay.visible = false;
    const roomBytes = await toGlb(room);
    const roomCheck = checkRoom(roomBytes, anchors);
    if (!roomCheck.ok) messages.push(roomCheck.reason);
    await save("room.glb", roomBytes, "model/gltf-binary");
    if (effectShape) {
      const effectBytes = await toGlb(effectShape);
      const effectCheck = checkEffect(effectBytes);
      if (!effectCheck.ok) messages.push(effectCheck.reason);
      await save("effect.glb", effectBytes, "model/gltf-binary");
    }
    // 대표 그림: 뒤쪽 위에서 스크린을 보는 모습(1280×720).
    const saved = { pos: camera.position.clone(), target: orbit.target.clone(), aspect: camera.aspect };
    renderer.setSize(1280, 720, false); camera.aspect = 16 / 9; camera.position.set(2.8, 2.3, 3.3); camera.lookAt(0, 1.1, -2.2); camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const blob = await new Promise((resolve) => renderer.domElement.toBlob(resolve, "image/webp", 0.82));
    const previewBytes = new Uint8Array(await blob.arrayBuffer());
    const previewProblem = checkPreview(previewBytes);
    if (previewProblem) messages.push(previewProblem);
    await save("preview.webp", previewBytes, "image/webp");
    camera.position.copy(saved.pos); orbit.target.copy(saved.target); camera.aspect = saved.aspect; resize();
    await save("dorabang.json", JSON.stringify({ anchors: { ...anchors, light }, intro }, null, 2), "application/json");
    renderChecklist(messages);
    hint.textContent = messages.length ? "저장했지만 고칠 것이 있어요. 오른쪽 아래를 봐 주세요." : "저장했어요. 이제 npm run check 로 검사하고 npm run send 로 보내면 돼요.";
  } catch (error) {
    hint.textContent = `저장하지 못했어요: ${error instanceof Error ? error.message : "알 수 없는 문제"}`;
  } finally { overlay.visible = showMarks; }
}

function resize() {
  renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener("resize", resize); resize();

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (mode === "walk") {
    const speed = 2.2 * dt;
    const f = (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0);
    const s = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
    if (keys.has("q")) walker.yaw += dt * 1.8; if (keys.has("e")) walker.yaw -= dt * 1.8;
    const dx = Math.sin(walker.yaw) * f * speed - Math.cos(walker.yaw) * s * speed, dz = Math.cos(walker.yaw) * f * speed + Math.sin(walker.yaw) * s * speed;
    if (!blocked(walker.x + dx, walker.z)) walker.x += dx;
    if (!blocked(walker.x, walker.z + dz)) walker.z += dz;
    camera.position.set(walker.x, 1.45, walker.z);
    camera.lookAt(walker.x + Math.sin(walker.yaw), 1.45 + Math.tan(walker.pitch), walker.z + Math.cos(walker.yaw));
  } else orbit.update();
  stepEffects(now);
  renderer.render(scene, camera);
});
