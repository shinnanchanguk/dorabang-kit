// 도라방 꾸미기 도구 상자. src/room.js 가 이 함수들로 교실 안쪽을 만든다.
// 모든 길이는 미터, 바닥이 y=0, 교실 가운데가 원점이다. 앞벽(출입문 있는 벽)은 +z, 뒷벽(스크린 벽)은 -z.
// 방향(yaw)은 라디안이다. 0 이면 +z(앞벽 쪽)를 보고, Math.PI 면 -z(뒷벽·스크린 쪽)를 본다.
import * as THREE from "three";

const materials = new Map();
/** 같은 색은 같은 재질을 나눠 쓴다(재질 수 상한 48). */
export function mat(color, { rough = 0.8, metal = 0, emissive = null } = {}) {
  const key = `${color}|${rough}|${metal}|${emissive}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...(emissive ? { emissive, emissiveIntensity: 0.8 } : {}) }));
  return materials.get(key);
}

/** 상자 하나. 바닥 가운데가 (x, y, z) 에 오도록 놓는다. */
export function box(w, h, d, color, { x = 0, y = 0, z = 0, yaw = 0, name } = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  mesh.position.set(x, y + h / 2, z); mesh.rotation.y = yaw;
  if (name) mesh.name = name;
  return mesh;
}

/** 원기둥(다리·화분·기둥). 바닥 가운데 기준. */
export function cylinder(r, h, color, { x = 0, y = 0, z = 0, segments = 12 } = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, segments), mat(color));
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

/** 의자 하나(앉는 자리 높이 0.45m). 등받이는 바라보는 방향의 반대쪽에 붙는다. */
export function chair({ color = "#8a5a3c", x = 0, z = 0, yaw = Math.PI } = {}) {
  const g = new THREE.Group();
  g.add(box(0.46, 0.06, 0.44, color, { y: 0.4 }));
  g.add(box(0.46, 0.5, 0.06, color, { y: 0.46, z: -0.2 }));
  for (const [lx, lz] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) g.add(box(0.05, 0.4, 0.05, "#3d3a36", { x: lx, z: lz }));
  g.position.set(x, 0, z); g.rotation.y = yaw;
  return g;
}

/**
 * 청중 좌석 묶음. rows × cols 개의 의자를 놓고 앉는 자리 이름표(seats)를 함께 돌려준다.
 * x0, z0: 첫 의자 자리 · dx, dz: 의자 사이 간격(통로를 두려면 0.9 이상) · yaw: 의자가 보는 방향.
 */
export function seatGrid({ rows = 3, cols = 5, x0 = -2.4, z0 = -0.6, dx = 1.2, dz = 1.1, yaw = Math.PI, color = "#8a5a3c" } = {}) {
  const group = new THREE.Group(); const seats = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = x0 + c * dx, z = z0 + r * dz;
    group.add(chair({ x, z, yaw, color }));
    seats.push({ pos: [round(x), 0, round(z)], yaw: round(yaw) });
  }
  return { group, seats };
}

/** 벽에 붙는 판(스크린 틀·전광판 바탕·알림판). panel 은 { center, width, height, yaw }. */
export function wallPanel(panel, { color = "#2b2f33", frame = "#c9a66b", depth = 0.04 } = {}) {
  const g = new THREE.Group();
  const [x, y, z] = panel.center;
  const back = new THREE.Mesh(new THREE.BoxGeometry(panel.width + 0.12, panel.height + 0.12, depth), mat(frame));
  back.position.set(0, 0, -depth); g.add(back);
  const face = new THREE.Mesh(new THREE.BoxGeometry(panel.width, panel.height, depth), mat(color));
  face.position.set(0, 0, -depth / 2 + 0.005); g.add(face);
  g.position.set(x, y, z); g.rotation.y = panel.yaw;
  return g;
}

/** 책상(발표자 탁자 등). */
export function desk({ x = 0, z = 0, yaw = 0, w = 1.2, d = 0.6, color = "#b98b5e" } = {}) {
  const g = new THREE.Group();
  g.add(box(w, 0.05, d, color, { y: 0.72 }));
  for (const [lx, lz] of [[-w / 2 + 0.05, -d / 2 + 0.05], [w / 2 - 0.05, -d / 2 + 0.05], [-w / 2 + 0.05, d / 2 - 0.05], [w / 2 - 0.05, d / 2 - 0.05]]) g.add(box(0.05, 0.72, 0.05, "#3d3a36", { x: lx, z: lz }));
  g.position.set(x, 0, z); g.rotation.y = yaw;
  return g;
}

/** 책장(벽에 붙여 두기). */
export function shelf({ x = 0, z = 0, yaw = 0, w = 1.4, h = 1.8, color = "#7a5236", books = ["#c0504d", "#4f81bd", "#9bbb59", "#f2c14e"] } = {}) {
  const g = new THREE.Group();
  g.add(box(w, h, 0.32, color));
  for (let level = 0; level < 4; level++) {
    const y = 0.15 + level * (h - 0.2) / 4;
    let cursor = -w / 2 + 0.1;
    for (let i = 0; cursor < w / 2 - 0.15; i++) {
      const bw = 0.06 + (i % 3) * 0.02, bh = 0.26 + (i % 4) * 0.03;
      g.add(box(bw, bh, 0.22, books[i % books.length], { x: cursor + bw / 2, y, z: 0.06 }));
      cursor += bw + 0.012;
    }
  }
  g.position.set(x, 0, z); g.rotation.y = yaw;
  return g;
}

/** 화분. */
export function plant({ x = 0, z = 0, size = 1 } = {}) {
  const g = new THREE.Group();
  g.add(cylinder(0.18 * size, 0.32 * size, "#9a6a4a"));
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 * size, 0), mat("#5e8f4e"));
  leaves.position.y = 0.62 * size; g.add(leaves);
  g.position.set(x, 0, z);
  return g;
}

/** 바닥 깔개(두께 2cm, 걷는 길을 막지 않는다). */
export function rug({ x = 0, z = 0, w = 4, d = 3, color = "#d9c7a7" } = {}) {
  return box(w, 0.02, d, color, { x, z });
}

/** 천장 조명(둥근 등). */
export function lamp({ x = 0, z = 0, color = "#fff3d6" } = {}) {
  const g = new THREE.Group();
  g.add(box(0.02, 0.4, 0.02, "#3d3a36", { y: 2.6 }));
  const shade = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), mat(color, { emissive: color }));
  shade.position.y = 2.5; g.add(shade);
  g.position.set(x, 0, z);
  return g;
}

const round = (v) => Math.round(v * 1000) / 1000;
export { THREE };
