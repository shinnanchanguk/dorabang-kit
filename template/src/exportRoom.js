// 미리보기의 '저장': 교실 꾸밈·연출 모양을 .glb 로, 기능 자리를 dorabang.json 으로, 대표 그림을 .webp 로.
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

export async function toGlb(object) {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(object, { binary: true, onlyVisible: true, maxTextureSize: 2048 });
  return new Uint8Array(result);
}

export async function save(name, body, type) {
  const response = await fetch(`/__kit/save?file=${encodeURIComponent(name)}`, { method: "POST", headers: { "Content-Type": type }, body });
  if (!response.ok) throw new Error(`${name} 저장 실패(${response.status})`);
  return response.json();
}
