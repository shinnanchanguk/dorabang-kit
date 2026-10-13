// 교실 틀(도름스가 그리는 것과 같은 모양). 미리보기에서만 그리고 내보내지 않는다.
import * as THREE from "three";
import { DOOR, ROOM } from "../scripts/lib/rules.js";

export function buildShell() {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: "#efe6d6", roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.halfX * 2, ROOM.halfZ * 2), new THREE.MeshStandardMaterial({ color: "#b9895f", roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; g.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.halfX * 2, ROOM.halfZ * 2), wall);
  ceiling.rotation.x = Math.PI / 2; ceiling.position.y = ROOM.height; g.add(ceiling);
  const add = (w, h, x, y, z, yaw) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wall); m.position.set(x, y, z); m.rotation.y = yaw; g.add(m); };
  add(ROOM.halfX * 2, ROOM.height, 0, ROOM.height / 2, -ROOM.halfZ, 0);
  add(ROOM.halfZ * 2, ROOM.height, -ROOM.halfX, ROOM.height / 2, 0, Math.PI / 2);
  add(ROOM.halfZ * 2, ROOM.height, ROOM.halfX, ROOM.height / 2, 0, -Math.PI / 2);
  // 앞벽: 출입문 자리를 비우고 세 조각으로.
  const left = DOOR.x - DOOR.width / 2 + ROOM.halfX, right = ROOM.halfX - (DOOR.x + DOOR.width / 2);
  add(left, ROOM.height, -ROOM.halfX + left / 2, ROOM.height / 2, ROOM.halfZ, Math.PI);
  add(right, ROOM.height, ROOM.halfX - right / 2, ROOM.height / 2, ROOM.halfZ, Math.PI);
  add(DOOR.width, ROOM.height - DOOR.height, DOOR.x, DOOR.height + (ROOM.height - DOOR.height) / 2, ROOM.halfZ, Math.PI);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(DOOR.width, DOOR.height), new THREE.MeshStandardMaterial({ color: "#6b4a2e", roughness: 0.7 }));
  door.position.set(DOOR.x, DOOR.height / 2, ROOM.halfZ + 0.01); door.rotation.y = Math.PI; g.add(door);
  return g;
}

export const LIGHT_PRESETS = {
  day: { hemi: ["#ffffff", "#c8b89a", 1.1], sun: ["#ffffff", 1.4], bg: "#dfe8ee" },
  warm: { hemi: ["#ffe9c9", "#8a6a4a", 0.9], sun: ["#ffd9a0", 1.1], bg: "#3b3026" },
  night: { hemi: ["#a9b8ff", "#2a2633", 0.45], sun: ["#9fb0ff", 0.5], bg: "#15161c" },
};
