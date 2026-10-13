// 도름스 서버의 도라방 검사(src/lib/school3d/dorabangSpec.ts · dorabangFile.ts)와 같은 규칙.
// 서버가 바뀌면 여기도 같이 바꾼다. npm run check 가 /api/school/dorabang/rules 와 숫자를 대조해 어긋나면 알려 준다.
export const SPEC_VERSION = 1;
/** 받침에 맞는 조사(서버 src/lib/josa.ts 와 같은 규칙: 마지막 한글 글자를 본다). */
function josa(word, withBatchim, without) {
  const hangul = String(word).normalize("NFC").match(/[가-힣](?=[^가-힣]*$)/);
  const batchim = hangul ? (hangul[0].charCodeAt(0) - 0xac00) % 28 !== 0 : false;
  return word + (batchim ? withBatchim : without);
}
export const ROOM = { halfX: 4.5, halfZ: 3.75, height: 3 };
export const DOOR = { x: 3.4, z: 3.75, width: 1, height: 2.1 };
export const SPAWN = { x: 3.4, y: 0, z: 2.9, yaw: Math.PI };
export const CLEAR = { floor: 0.05, doorDepth: 1, spawnRadius: 0.6 };
export const EFFECTS = ["rain", "burst", "rise", "spin"];
export const LIGHTS = ["day", "warm", "night"];
export const LIMITS = {
  roomBytes: 8 * 1024 * 1024, roomTriangles: 150_000, roomImages: 16, roomMaterials: 48, roomNodes: 600,
  effectBytes: 300 * 1024, effectTriangles: 5_000, effectImages: 2,
  imageBytes: 1024 * 1024, imageSide: 2048, previewBytes: 400 * 1024, anchorsBytes: 16 * 1024,
  seatsMin: 12, seatsMax: 80, introMax: 80,
  screen: { minW: 1.2, maxW: 6, minH: 0.6, maxH: 3 },
  board: { minW: 0.6, maxW: 6, minH: 0.25, maxH: 2 },
  wallGap: 0.2,
};
export const FEATURES = [
  ["screen", "발표 스크린(화면 공유가 비치는 곳)"],
  ["presenter", "발표자 자리"],
  ["mcSeats", "MC·부방장 의자 2개"],
  ["seats", `청중 좌석(${LIMITS.seatsMin}석 이상)`],
  ["titleBoard", "방송 제목 전광판"],
  ["attendance", "출석 연출 자리와 연출"],
  ["donation", "도름네이션 연출과 알림판 자리"],
  ["light", "조명"],
];
const ALLOWED_EXTENSIONS = new Set(["KHR_materials_emissive_strength", "KHR_texture_transform", "KHR_materials_unlit", "EXT_meshopt_compression", "KHR_mesh_quantization"]);

const num = (v) => typeof v === "number" && Number.isFinite(v);
const vec = (v) => Array.isArray(v) && v.length === 3 && v.every(num);
const inside = (p, margin = 0) => Math.abs(p[0]) <= ROOM.halfX - margin && Math.abs(p[2]) <= ROOM.halfZ - margin && p[1] >= 0 && p[1] <= ROOM.height;

export function inClearZone(x, z) {
  const door = Math.abs(x - DOOR.x) <= DOOR.width / 2 + 0.1 && z >= DOOR.z - CLEAR.doorDepth;
  const spawn = Math.hypot(x - SPAWN.x, z - SPAWN.z) <= CLEAR.spawnRadius;
  return door || spawn;
}
function spot(o, label, problems) {
  if (!o || typeof o !== "object" || !vec(o.pos) || !num(o.yaw)) { problems.push(`${label}의 자리(pos)와 방향(yaw)을 적어 주세요.`); return null; }
  if (!inside(o.pos, 0.2)) { problems.push(`${josa(label, "이", "가")} 교실 틀 밖이에요. 벽에서 0.2m 안쪽에 두어 주세요.`); return null; }
  if (o.pos[1] > 1.2) { problems.push(`${josa(label, "은", "는")} 바닥 가까이(높이 1.2m 이하)에 두어 주세요.`); return null; }
  if (inClearZone(o.pos[0], o.pos[2])) { problems.push(`${josa(label, "이", "가")} 출입문 앞이나 시작 자리를 막아요.`); return null; }
  return o;
}
function panel(o, label, size, problems) {
  if (!o || typeof o !== "object" || !vec(o.center) || !num(o.width) || !num(o.height) || !num(o.yaw)) { problems.push(`${label}의 가운데(center)·너비·높이·방향을 적어 주세요.`); return null; }
  if (o.width < size.minW || o.width > size.maxW || o.height < size.minH || o.height > size.maxH) {
    problems.push(`${label} 크기는 너비 ${size.minW}~${size.maxW}m, 높이 ${size.minH}~${size.maxH}m 여야 해요.`); return null;
  }
  const half = o.width / 2, c = o.center;
  const corners = [-1, 1].map((s) => [c[0] + Math.cos(o.yaw) * half * s, c[1], c[2] - Math.sin(o.yaw) * half * s]);
  if (!corners.every((p) => inside(p)) || c[1] - o.height / 2 < 0 || c[1] + o.height / 2 > ROOM.height) { problems.push(`${josa(label, "이", "가")} 교실 틀 밖으로 나가요.`); return null; }
  if (Math.min(ROOM.halfX - Math.abs(c[0]), ROOM.halfZ - Math.abs(c[2])) > LIMITS.wallGap) { problems.push(`${josa(label, "은", "는")} 벽에 붙여 주세요(벽에서 ${LIMITS.wallGap}m 이내).`); return null; }
  return o;
}
function point(v, label, problems) {
  if (!vec(v)) { problems.push(`${label}의 자리(pos)를 적어 주세요.`); return null; }
  if (!inside(v, 0.1)) { problems.push(`${josa(label, "이", "가")} 교실 틀 밖이에요.`); return null; }
  return v;
}

/** dorabang.json 검사. 빠진 기능과 문제를 쉬운 말로 모두 돌려준다. */
export function checkAnchors(o) {
  const problems = [];
  if (!o || typeof o !== "object" || Array.isArray(o)) return ["dorabang.json 은 JSON 객체여야 해요."];
  if (o.version !== 1) problems.push("dorabang.json 의 version 은 1 이어야 해요.");
  for (const [key, label] of FEATURES) if (o[key] === undefined) problems.push(`빠진 기능: ${label}`);
  if (problems.length) return problems;
  panel(o.screen, "발표 스크린", LIMITS.screen, problems);
  const presenter = spot(o.presenter, "발표자 자리", problems);
  const mc = Array.isArray(o.mcSeats) ? o.mcSeats : [];
  if (mc.length !== 2) problems.push("MC·부방장 의자는 2개여야 해요.");
  const mcSeats = mc.slice(0, 2).map((s, i) => spot(s, `${i + 1}번 MC·부방장 의자`, problems));
  const seatList = Array.isArray(o.seats) ? o.seats : [];
  if (seatList.length < LIMITS.seatsMin || seatList.length > LIMITS.seatsMax) problems.push(`청중 좌석은 ${LIMITS.seatsMin}석 이상 ${LIMITS.seatsMax}석 이하여야 해요(지금 ${seatList.length}석).`);
  const seats = seatList.slice(0, LIMITS.seatsMax).map((s, i) => spot(s, `${i + 1}번 청중 좌석`, problems));
  panel(o.titleBoard, "방송 제목 전광판", LIMITS.board, problems);
  point(o.attendance?.pos, "출석 연출 자리", problems);
  if (!EFFECTS.includes(o.attendance?.effect)) problems.push(`출석 연출은 ${EFFECTS.join(" · ")} 가운데 하나여야 해요.`);
  point(o.donation?.pos, "도름네이션 연출 자리", problems);
  if (!EFFECTS.includes(o.donation?.effect)) problems.push(`도름네이션 연출은 ${EFFECTS.join(" · ")} 가운데 하나여야 해요.`);
  panel(o.donation?.board, "도름네이션 알림판", LIMITS.board, problems);
  if (!LIGHTS.includes(o.light)) problems.push(`조명은 ${LIGHTS.join(" · ")} 가운데 하나여야 해요.`);
  const all = [presenter, ...mcSeats, ...seats].filter(Boolean);
  outer: for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
    if (Math.hypot(all[i].pos[0] - all[j].pos[0], all[i].pos[2] - all[j].pos[2]) < 0.45) { problems.push("자리끼리 너무 붙어 있어요(0.45m 이상 떨어뜨려 주세요)."); break outer; }
  }
  if (JSON.stringify(o).length > LIMITS.anchorsBytes) problems.push("dorabang.json 이 너무 커요(16KB 이하).");
  return problems;
}

// ── glb ───────────────────────────────────────────────────────────────────────────────
/**
 * .glb 덩어리 배치는 정확히 하나: 머리글 → JSON 덩어리 하나 → (있으면) BIN 덩어리 하나 → 파일 끝.
 * 덩어리를 덧붙이면 검사하는 쪽과 그리는 쪽이 다른 덩어리를 읽을 수 있어서 서버가 거절한다(서버 glbLayout 과 같다).
 */
function glbLayout(bytes) {
  if (bytes.byteLength < 20) return "파일 구조를 읽지 못했어요.";
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) return "glTF 2.0 바이너리(.glb) 파일이 아니에요.";
  if (view.getUint32(8, true) !== bytes.byteLength) return "파일 길이가 머리글과 달라요.";
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || jsonLength < 2 || jsonLength % 4 !== 0 || 20 + jsonLength > bytes.byteLength) return "파일 구조를 읽지 못했어요.";
  const start = 20 + jsonLength;
  if (start === bytes.byteLength) return { jsonLength, bin: null };
  if (start + 8 > bytes.byteLength) return "파일 구조를 읽지 못했어요.";
  const binLength = view.getUint32(start, true);
  if (view.getUint32(start + 4, true) !== 0x004e4942 || binLength % 4 !== 0 || start + 8 + binLength !== bytes.byteLength) return "파일 안에 덩어리가 덧붙어 있어요. 내보내기 도구로 다시 저장해 주세요.";
  return { jsonLength, bin: bytes.subarray(start + 8, start + 8 + binLength) };
}
function parseGlb(bytes, maxBytes) {
  if (bytes.byteLength < 20 || bytes.byteLength > maxBytes) return `파일 크기는 ${Math.round(maxBytes / 1024 / 1024 * 10) / 10}MB 이하여야 해요.`;
  const layout = glbLayout(bytes);
  if (typeof layout === "string") return layout;
  const { jsonLength } = layout;
  try {
    const gltf = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(20, 20 + jsonLength)));
    if (!gltf || typeof gltf !== "object" || gltf.asset?.version !== "2.0") return "glTF 2.0 파일이 아니에요.";
    return { gltf, jsonLength };
  } catch { return "파일 구조를 읽지 못했어요."; }
}
function extensionKeys(value, depth = 0, out = []) {
  if (depth > 12 || !value || typeof value !== "object") return out;
  if (Array.isArray(value)) { for (const item of value) extensionKeys(item, depth + 1, out); return out; }
  for (const [key, child] of Object.entries(value)) {
    if (key === "extensions" && child && typeof child === "object") out.push(...Object.keys(child));
    extensionKeys(child, depth + 1, out);
  }
  return out;
}
function binChunk(bytes, jsonLength) {
  const layout = glbLayout(bytes);
  return typeof layout === "string" || layout.jsonLength !== jsonLength ? null : layout.bin;
}
export function imageSize(data) {
  if (!data || data.byteLength < 30) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (view.getUint32(0) === 0x89504e47) return { width: view.getUint32(16), height: view.getUint32(20) };
  if (data[0] === 0xff && data[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < data.byteLength) {
      if (data[offset] !== 0xff) return null;
      const marker = data[offset + 1], length = view.getUint16(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) };
      offset += 2 + length;
    }
    return null;
  }
  const tag = (at) => String.fromCharCode(...data.subarray(at, at + 4));
  if (tag(0) === "RIFF" && tag(8) === "WEBP") {
    const kind = tag(12);
    if (kind === "VP8X") return { width: 1 + (data[24] | data[25] << 8 | data[26] << 16), height: 1 + (data[27] | data[28] << 8 | data[29] << 16) };
    if (kind === "VP8L") { const b = view.getUint32(21, true); return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff) }; }
    if (kind === "VP8 ") return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
  }
  return null;
}
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}
function local(node) {
  if (node.matrix !== undefined) {
    const m = node.matrix;
    if (!Array.isArray(m) || m.length !== 16 || !m.every((v) => typeof v === "number" && Number.isFinite(v))) return null;
    // 그리는 쪽(three.js)은 matrix 를 위치·회전·크기로 나눴다가 다시 합친다. 기울임·원근이 있는 행렬은 받지 않는다(서버와 같다).
    if (m[3] !== 0 || m[7] !== 0 || m[11] !== 0 || m[15] !== 1) return null;
    const axes = [[m[0], m[1], m[2]], [m[4], m[5], m[6]], [m[8], m[9], m[10]]];
    const len = axes.map((a) => Math.hypot(a[0], a[1], a[2]));
    if (len.some((l) => l < 1e-9)) return null;
    for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
      const dot = axes[i][0] * axes[j][0] + axes[i][1] * axes[j][1] + axes[i][2] * axes[j][2];
      if (Math.abs(dot) > 1e-5 * len[i] * len[j]) return null;
    }
    return m;
  }
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  if (![tx, ty, tz, x, y, z, w, sx, sy, sz].every(Number.isFinite)) return null;
  return [
    (1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + z * w)) * sx, (2 * (x * z - y * w)) * sx, 0,
    (2 * (x * y - z * w)) * sy, (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + x * w)) * sy, 0,
    (2 * (x * z + y * w)) * sz, (2 * (y * z - x * w)) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
function transformBox(m, min, max) {
  const out = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  for (const cx of [min[0], max[0]]) for (const cy of [min[1], max[1]]) for (const cz of [min[2], max[2]]) {
    const p = [m[0] * cx + m[4] * cy + m[8] * cz + m[12], m[1] * cx + m[5] * cy + m[9] * cz + m[13], m[2] * cx + m[6] * cy + m[10] * cz + m[14]];
    for (let i = 0; i < 3; i++) { out.min[i] = Math.min(out.min[i], p[i]); out.max[i] = Math.max(out.max[i], p[i]); }
  }
  return out;
}

/** 꼭짓점 자리 자료형 → 크기·읽기·정규화 나눗수(서버 dorabangFile.ts 와 같다). */
const COMPONENTS = {
  5126: { size: 4, read: (v, o) => v.getFloat32(o, true), norm: 1 },
  5120: { size: 1, read: (v, o) => v.getInt8(o), norm: 127 },
  5121: { size: 1, read: (v, o) => v.getUint8(o), norm: 255 },
  5122: { size: 2, read: (v, o) => v.getInt16(o, true), norm: 32767 },
  5123: { size: 2, read: (v, o) => v.getUint16(o, true), norm: 65535 },
};
const whole = (value) => value === undefined ? 0 : Number.isSafeInteger(value) && value >= 0 ? value : null;
const SHAPE = { accessorCount: 1_000_000, decodedVertices: 2_000_000, views: 2_000, accessors: 4_000, primitives: 1_200, accessorBytes: 64 * 1024 * 1024 };
const TYPE_WIDTH = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const INDEX_TYPES = new Set([5121, 5123, 5125]);
const ATTRIBUTE_NAME = /^(POSITION|NORMAL|TANGENT|TEXCOORD_\d+|COLOR_\d+|JOINTS_\d+|WEIGHTS_\d+|_[A-Z0-9_]+)$/;
/** 모양 자료 표의 번호·길이·자리·자료형이 제자리인지(서버 shapeTables 와 같다). */
function shapeTables(gltf, bin) {
  const isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  const list = (value) => value === undefined ? [] : Array.isArray(value) ? value : null;
  const views = list(gltf.bufferViews), accessors = list(gltf.accessors), meshes = list(gltf.meshes), nodes = list(gltf.nodes), scenes = list(gltf.scenes);
  if (!views || !accessors || !meshes || !nodes || !scenes) return "모양 자료 표가 이상해요.";
  // 모든 표는 목록이어야 한다(객체로 쓰면 그리는 쪽은 번호로 읽어 길이 검사를 피한다, 서버와 같다).
  for (const key of ["skins", "animations", "cameras", "materials", "images", "buffers", "textures", "samplers", "extensionsUsed", "extensionsRequired"]) {
    if (list(gltf[key]) === null) return "모양 자료 표가 이상해요.";
  }
  if (views.length > SHAPE.views || accessors.length > SHAPE.accessors) return "모양 자료가 너무 많아요.";
  if (scenes.length > 1 || whole(gltf.scene) === null || (gltf.scene ?? 0) !== 0) return "장면(scene)은 하나만 넣어 주세요.";
  let viewBytes = 0;
  for (const view of views) {
    if (!isObject(view)) return "모양 자료 칸이 이상해요.";
    const start = whole(view.byteOffset), length = whole(view.byteLength), buffer = whole(view.buffer);
    if (start === null || length === null || buffer !== 0) return "모양 자료 칸이 이상해요.";
    if (!bin || start + length > bin.byteLength) return "모양 자료 칸이 파일 범위를 벗어나요.";
    if (view.byteStride !== undefined) {
      const stride = whole(view.byteStride);
      if (stride === null || stride < 4 || stride > 252 || stride % 4 !== 0) return "모양 자료 간격이 이상해요.";
    }
    viewBytes += length;
    if (viewBytes > bin.byteLength * 2) return "모양 자료 칸이 너무 많이 겹쳐 있어요.";
  }
  let accessorBytes = 0;
  for (const accessor of accessors) {
    if (!isObject(accessor)) return "모양 자료 번호가 이상해요.";
    if (accessor.sparse !== undefined) return "흩어 둔(sparse) 자리 자료는 쓸 수 없어요. 내보내기 도구로 다시 저장해 주세요.";
    if (accessor.bufferView === undefined) return "모양 자료는 파일 안에 담아 주세요.";
    const offset = whole(accessor.byteOffset), count = whole(accessor.count), view = whole(accessor.bufferView);
    if (offset === null || count === null || view === null || view >= views.length) return "모양 자료 번호가 이상해요.";
    if (count > SHAPE.accessorCount) return "모양 자료 하나가 너무 커요.";
    const componentType = typeof accessor.componentType === "number" ? accessor.componentType : -1;
    const size = COMPONENTS[componentType]?.size ?? (componentType === 5125 ? 4 : 0);
    const width = typeof accessor.type === "string" ? TYPE_WIDTH[accessor.type] : undefined;
    if (!size || !width) return "모양 자료형이 이상해요.";
    if (accessor.normalized !== undefined && typeof accessor.normalized !== "boolean") return "모양 자료형이 이상해요.";
    if (offset % size !== 0 || ((whole(views[view].byteOffset) ?? 0) + offset) % size !== 0) return "모양 자료 시작 자리가 자료형 크기에 맞지 않아요.";
    accessorBytes += count * size * width;
    if (accessorBytes > SHAPE.accessorBytes) return "모양 자료가 너무 커요.";
  }
  let primitives = 0;
  for (const mesh of meshes) {
    const prims = isObject(mesh) ? list(mesh.primitives) : null;
    if (!prims) return "모양 조각 자료가 이상해요.";
    for (const p of prims) {
      if (!isObject(p)) return "모양 조각 자료가 이상해요.";
      if (++primitives > SHAPE.primitives) return "모양 조각(primitive)이 너무 많아요.";
      const mode = whole(p.mode ?? 4), indices = p.indices === undefined ? undefined : whole(p.indices);
      if (mode === null || indices === null || (indices !== undefined && (indices >= accessors.length || !INDEX_TYPES.has(accessors[indices].componentType ?? -1)))) return "모양 조각 자료가 이상해요.";
      if (p.attributes !== undefined && !isObject(p.attributes)) return "모양 조각 자료가 이상해요.";
      if (p.targets !== undefined && !Array.isArray(p.targets)) return "모양 조각 자료가 이상해요.";
      if (Object.keys(p.attributes ?? {}).some((name) => !ATTRIBUTE_NAME.test(name))) return "모양 자료 이름이 glTF 규칙과 달라요. 내보내기 도구로 다시 저장해 주세요.";
      if (indices !== undefined) {
        const indexView = whole(accessors[indices].bufferView);
        if (indexView !== null && views[indexView]?.byteStride !== undefined) return "꼭짓점 번호 자료에는 간격(byteStride)을 둘 수 없어요.";
      }
      for (const value of Object.values(p.attributes ?? {})) { const at = whole(value); if (at === null || at >= accessors.length) return "모양 조각 자료가 이상해요."; }
    }
  }
  for (const node of nodes) {
    if (!isObject(node)) return "부품 연결이 이상해요.";
    if (node.mesh !== undefined) { const mesh = whole(node.mesh); if (mesh === null || mesh >= meshes.length) return "부품 연결이 이상해요."; }
    const children = list(node.children);
    if (!children) return "부품 연결이 이상해요.";
    for (const child of children) { const at = whole(child); if (at === null || at >= nodes.length) return "부품 연결이 이상해요."; }
  }
  const scene = scenes[0];
  if (scene !== undefined) {
    const roots = isObject(scene) ? list(scene.nodes) : null;
    if (!roots) return "부품 연결이 이상해요.";
    for (const root of roots) { const at = whole(root); if (at === null || at >= nodes.length) return "부품 연결이 이상해요."; }
  }
  return null;
}
/** 실제 꼭짓점을 읽어 범위를 구한다(적어 둔 min·max 가 아니라). 흩어 둔(sparse) 자리는 받지 않는다. */
function positionBox(gltf, bin, index) {
  const accessor = gltf.accessors?.[index];
  if (!accessor || accessor.type !== "VEC3") return "모양의 자리 자료(POSITION)가 이상해요.";
  if (accessor.sparse !== undefined) return "흩어 둔(sparse) 자리 자료는 쓸 수 없어요. 내보내기 도구로 다시 저장해 주세요.";
  const component = COMPONENTS[accessor.componentType ?? -1];
  const count = accessor.count ?? 0;
  if (!component || !Number.isInteger(count) || count < 0) return "모양의 자리 자료형이 이상해요.";
  if (count === 0) return null;
  if (accessor.bufferView === undefined) return "모양의 자리 자료가 파일에 담겨 있지 않아요.";
  const view = gltf.bufferViews?.[accessor.bufferView];
  if (!view || !bin || (view.buffer ?? 0) !== 0) return "모양 자료를 찾지 못했어요.";
  const element = component.size * 3, stride = view.byteStride ?? element;
  const viewStart = view.byteOffset ?? 0, viewLength = view.byteLength ?? 0;
  const start = viewStart + (accessor.byteOffset ?? 0);
  if (!Number.isInteger(stride) || stride < element || stride > 252) return "모양 자료 간격이 이상해요.";
  const end = start + stride * (count - 1) + element;
  if (start < 0 || end > viewStart + viewLength || end > bin.byteLength) return "모양 자료가 파일 범위를 벗어나요.";
  const data = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  const signed = accessor.componentType === 5120 || accessor.componentType === 5122;
  for (let i = 0; i < count; i++) {
    const at = start + i * stride;
    for (let axis = 0; axis < 3; axis++) {
      let value = component.read(data, at + axis * component.size);
      if (accessor.normalized === true && component.norm !== 1) value = signed ? Math.max(value / component.norm, -1) : value / component.norm;
      if (!Number.isFinite(value)) return "모양 자리 값이 이상해요.";
      if (value < box.min[axis]) box.min[axis] = value;
      if (value > box.max[axis]) box.max[axis] = value;
    }
  }
  return box;
}

function structural(bytes, gltf, jsonLength, limits, label) {
  const declared = new Set(gltf.extensionsUsed ?? []);
  for (const name of [...declared, ...(gltf.extensionsRequired ?? [])]) if (!ALLOWED_EXTENSIONS.has(name)) return `쓸 수 없는 확장(${String(name).slice(0, 60)})이 들어 있어요.`;
  const hidden = extensionKeys(gltf).find((name) => !ALLOWED_EXTENSIONS.has(name) || !declared.has(name));
  if (hidden) return `쓸 수 없는 확장(${hidden.slice(0, 60)})이 들어 있어요.`;
  // 도라방은 압축(meshopt)한 모양을 받지 않는다(서버가 꼭짓점을 직접 읽어 자리를 확인한다).
  if (declared.has("EXT_meshopt_compression")) return "압축(meshopt)한 모양은 쓸 수 없어요. 압축하지 않고 내보내 주세요.";
  if ((gltf.buffers ?? []).some((b) => b.uri !== undefined)) return "바깥 파일을 부르는 부분이 있어요. 모두 한 파일에 담아 주세요.";
  const images = gltf.images ?? [];
  if (images.length > limits.images) return `${label}에 그림은 ${limits.images}장까지 넣을 수 있어요.`;
  const bin = binChunk(bytes, jsonLength);
  for (const image of images) {
    if (image.uri !== undefined || typeof image.bufferView !== "number") return "그림은 파일 안에 담아 주세요.";
    if (!["image/png", "image/jpeg", "image/webp"].includes(image.mimeType ?? "")) return "그림은 PNG·JPG·WebP 만 쓸 수 있어요.";
    const view = gltf.bufferViews?.[image.bufferView];
    if ((view?.byteLength ?? Infinity) > LIMITS.imageBytes) return "그림 한 장은 1MB 이하여야 해요.";
    const size = imageSize(bin?.subarray(view?.byteOffset ?? 0, (view?.byteOffset ?? 0) + (view?.byteLength ?? 0)));
    if (!size || size.width > LIMITS.imageSide || size.height > LIMITS.imageSide) return `그림 크기는 가로세로 ${LIMITS.imageSide}픽셀 이하여야 해요.`;
  }
  const tables = shapeTables(gltf, bin);
  if (tables) return tables;
  if ((gltf.materials ?? []).length > limits.materials) return `${label}에 재질은 ${limits.materials}개까지 쓸 수 있어요.`;
  const nodes = gltf.nodes ?? [];
  if (nodes.length > limits.nodes) return `${label}에 부품이 너무 많아요(${nodes.length}개, ${limits.nodes}개 이하).`;
  if ((gltf.animations ?? []).length) return "움직임(애니메이션)은 넣지 않아요. 움직이는 연출은 도름스가 준비한 것 가운데 고르면 돼요.";
  if ((gltf.skins ?? []).length) return "뼈대(skin)는 넣지 않아요.";
  if ((gltf.cameras ?? []).length || nodes.some((n) => n.camera !== undefined)) return "카메라는 넣지 않아요.";
  // 같은 자리 자료를 여러 조각이 함께 쓰면 한 번만 읽고, 읽는 꼭짓점 수 전체에 상한을 둔다(서버와 같다).
  const decoded = new Map();
  let decodedVertices = 0;
  const boxOf = (index) => {
    if (decoded.has(index)) return decoded.get(index);
    decodedVertices += gltf.accessors?.[index]?.count ?? 0;
    const result = decodedVertices > SHAPE.decodedVertices ? "모양의 꼭짓점이 너무 많아요." : positionBox(gltf, bin, index);
    decoded.set(index, result);
    return result;
  };
  const meshTriangles = [], meshBoxes = [];
  for (const mesh of gltf.meshes ?? []) {
    let count = 0, box = null;
    for (const p of mesh.primitives ?? []) {
      if ((p.mode ?? 4) !== 4) return "면(삼각형)으로 된 모양만 쓸 수 있어요.";
      if (p.targets?.length) return "모양이 바뀌는 부품(morph)은 쓸 수 없어요.";
      const positionIndex = p.attributes?.POSITION;
      if (typeof positionIndex !== "number") return "모양의 자리 자료(POSITION)가 없어요. 내보내기 도구로 다시 저장해 주세요.";
      const actual = boxOf(positionIndex);
      if (typeof actual === "string") return actual;
      const accessor = gltf.accessors?.[p.indices ?? positionIndex];
      count += Math.floor((accessor?.count ?? 0) / 3);
      if (actual) box = box ? { min: box.min.map((v, i) => Math.min(v, actual.min[i])), max: box.max.map((v, i) => Math.max(v, actual.max[i])) } : actual;
    }
    meshTriangles.push(count); meshBoxes.push(box);
  }
  const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? [];
  const boxes = []; let triangles = 0, visits = 0;
  const walk = (index, parent, path) => {
    if (++visits > limits.nodes * 4) return "부품 연결이 너무 깊어요.";
    const node = nodes[index];
    if (!node || path.has(index)) return "부품 연결이 이상해요.";
    const m = local(node);
    if (!m) return "부품 자리 값이 이상해요.";
    const world = multiply(parent, m);
    if (typeof node.mesh === "number") {
      triangles += meshTriangles[node.mesh] ?? 0;
      const box = meshBoxes[node.mesh];
      if (box) boxes.push(transformBox(world, box.min, box.max));
    }
    path.add(index);
    for (const child of node.children ?? []) { const problem = walk(child, world, path); if (problem) return problem; }
    path.delete(index);
    return null;
  };
  for (const root of roots) { const problem = walk(root, identity(), new Set()); if (problem) return problem; }
  if (!triangles) return `${label} 모양이 비어 있어요.`;
  if (triangles > limits.triangles) return `${label}의 면이 너무 많아요(${triangles.toLocaleString("ko-KR")}개, ${limits.triangles.toLocaleString("ko-KR")}개 이하).`;
  return { triangles, boxes };
}
const CELL = 0.25;
function walkable(boxes, anchors) {
  const nx = Math.round(ROOM.halfX * 2 / CELL), nz = Math.round(ROOM.halfZ * 2 / CELL);
  const blocked = new Uint8Array(nx * nz);
  const cell = (x, z) => [Math.floor((x + ROOM.halfX) / CELL), Math.floor((z + ROOM.halfZ) / CELL)];
  for (const b of boxes) {
    if (b.max[1] <= CLEAR.floor || b.min[1] >= 1.6) continue;
    const [x0, z0] = cell(b.min[0], b.min[2]), [x1, z1] = cell(b.max[0], b.max[2]);
    for (let x = Math.max(0, x0); x <= Math.min(nx - 1, x1); x++) for (let z = Math.max(0, z0); z <= Math.min(nz - 1, z1); z++) blocked[z * nx + x] = 1;
  }
  const [sx, sz] = cell(SPAWN.x, SPAWN.z);
  const seen = new Uint8Array(nx * nz); const queue = [sz * nx + sx]; seen[queue[0]] = 1;
  while (queue.length) {
    const at = queue.shift(); const x = at % nx, z = Math.floor(at / nx);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Z = z + dz;
      if (X < 0 || Z < 0 || X >= nx || Z >= nz) continue;
      const i = Z * nx + X;
      if (seen[i] || blocked[i]) continue;
      seen[i] = 1; queue.push(i);
    }
  }
  const reach = (px, pz) => {
    const [cx, cz] = cell(px, pz); const r = Math.ceil(0.7 / CELL);
    for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) if (x >= 0 && z >= 0 && x < nx && z < nz && seen[z * nx + x]) return true;
    return false;
  };
  const targets = [["발표자 자리", anchors.presenter.pos], ...anchors.mcSeats.map((s, i) => [`${i + 1}번 MC·부방장 의자`, s.pos]), ...anchors.seats.map((s, i) => [`${i + 1}번 청중 좌석`, s.pos])];
  for (const [label, p] of targets) if (!reach(p[0], p[2])) return `시작 자리에서 ${label}까지 걸어갈 길이 막혀 있어요.`;
  return null;
}

const UNREADABLE = { ok: false, reason: "파일 구조를 읽지 못했어요. 내보내기 도구로 다시 저장해 주세요." };
/** room.glb 검사(서버 checkDorabangRoom 과 같다). */
export function checkRoom(bytes, anchors) {
  try { return checkRoomInner(bytes, anchors); } catch { return UNREADABLE; }
}
function checkRoomInner(bytes, anchors) {
  const parsed = parseGlb(bytes, LIMITS.roomBytes);
  if (typeof parsed === "string") return { ok: false, reason: parsed };
  const result = structural(bytes, parsed.gltf, parsed.jsonLength, { images: LIMITS.roomImages, triangles: LIMITS.roomTriangles, materials: LIMITS.roomMaterials, nodes: LIMITS.roomNodes }, "교실 꾸밈");
  if (typeof result === "string") return { ok: false, reason: result };
  const eps = 0.02;
  for (const b of result.boxes) {
    if (b.min[0] < -ROOM.halfX - eps || b.max[0] > ROOM.halfX + eps || b.min[2] < -ROOM.halfZ - eps || b.max[2] > ROOM.halfZ + eps || b.min[1] < -eps || b.max[1] > ROOM.height + eps) {
      return { ok: false, reason: "교실 틀(가로 9m · 세로 7.5m · 높이 3m) 밖으로 나간 부품이 있어요." };
    }
    if (b.max[1] > CLEAR.floor) {
      const doorBlocked = b.max[0] > DOOR.x - DOOR.width / 2 && b.min[0] < DOOR.x + DOOR.width / 2 && b.max[2] > DOOR.z - CLEAR.doorDepth && b.min[1] < DOOR.height;
      const nx = Math.max(b.min[0], Math.min(SPAWN.x, b.max[0])), nz = Math.max(b.min[2], Math.min(SPAWN.z, b.max[2]));
      const spawnBlocked = Math.hypot(nx - SPAWN.x, nz - SPAWN.z) < CLEAR.spawnRadius && b.min[1] < 1.6;
      if (doorBlocked || spawnBlocked) return { ok: false, reason: "출입문 앞(1m)이나 시작 자리 둘레(0.6m)에 놓인 부품이 있어요. 비워 두어 주세요." };
    }
  }
  const path = walkable(result.boxes, anchors);
  if (path) return { ok: false, reason: path };
  return { ok: true, triangles: result.triangles };
}

/** effect.glb 검사(서버 checkDorabangEffect 과 같다). */
export function checkEffect(bytes) {
  try { return checkEffectInner(bytes); } catch { return UNREADABLE; }
}
function checkEffectInner(bytes) {
  const parsed = parseGlb(bytes, LIMITS.effectBytes);
  if (typeof parsed === "string") return { ok: false, reason: parsed };
  const result = structural(bytes, parsed.gltf, parsed.jsonLength, { images: LIMITS.effectImages, triangles: LIMITS.effectTriangles, materials: 8, nodes: 40 }, "연출 모양");
  if (typeof result === "string") return { ok: false, reason: result };
  if (result.boxes.some((b) => b.min.some((v) => v < -0.51) || b.max.some((v) => v > 0.51))) return { ok: false, reason: "연출 모양은 가운데가 원점인 1m 상자 안에 들어가야 해요." };
  return { ok: true, triangles: result.triangles };
}

export function checkPreview(bytes) {
  if (bytes.byteLength < 16 || bytes.byteLength > LIMITS.previewBytes) return "대표 그림은 400KB 이하여야 해요.";
  const tag = (offset) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (tag(0) !== "RIFF" || tag(8) !== "WEBP") return "대표 그림은 WebP 여야 해요.";
  return null;
}

/** 서버가 알려 준 규칙과 이 도구의 숫자가 같은지. 다르면 도구가 낡은 것이다. */
export function sameRules(remote) {
  if (!remote || remote.version !== SPEC_VERSION) return false;
  const pick = (o) => JSON.stringify({ room: o.room, door: o.door, spawn: o.spawn, clear: o.clear, limits: o.limits, effects: o.effects, lights: o.lights });
  return pick(remote) === pick({ room: ROOM, door: DOOR, spawn: SPAWN, clear: CLEAR, limits: LIMITS, effects: EFFECTS, lights: LIGHTS });
}
