// 시험용 .glb 를 손으로 만든다(상자들). three 없이 돌아간다.
export function makeGlb(boxes, { extra = {} } = {}) {
  const positions = [], indices = [], meshes = [], nodes = [], accessors = [], views = [];
  let posOffset = 0, idxOffset = 0;
  const posChunks = [], idxChunks = [];
  boxes.forEach((b, i) => {
    const [x0, y0, z0] = b.min, [x1, y1, z1] = b.max;
    const p = new Float32Array([x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0, x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1]);
    const idx = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1, 3, 2, 6, 3, 6, 7, 0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2]);
    posChunks.push(p); idxChunks.push(idx);
    views.push({ buffer: 0, byteOffset: 0, byteLength: p.byteLength, _pos: true, _i: i });
    views.push({ buffer: 0, byteOffset: 0, byteLength: idx.byteLength, _idx: true, _i: i });
    accessors.push({ bufferView: views.length - 2, componentType: 5126, count: 8, type: "VEC3", min: [x0, y0, z0], max: [x1, y1, z1] });
    accessors.push({ bufferView: views.length - 1, componentType: 5123, count: 36, type: "SCALAR" });
    meshes.push({ primitives: [{ attributes: { POSITION: accessors.length - 2 }, indices: accessors.length - 1 }] });
    nodes.push({ mesh: i });
  });
  // 바이너리 묶기(4바이트 정렬).
  const parts = []; let offset = 0;
  for (const v of views) {
    const data = v._pos ? posChunks[v._i] : idxChunks[v._i];
    v.byteOffset = offset; parts.push(new Uint8Array(data.buffer)); offset += data.byteLength;
    const pad = (4 - (offset % 4)) % 4; if (pad) { parts.push(new Uint8Array(pad)); offset += pad; }
    delete v._pos; delete v._idx; delete v._i;
  }
  const bin = new Uint8Array(offset); let at = 0; for (const part of parts) { bin.set(part, at); at += part.byteLength; }
  const gltf = { asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, accessors, bufferViews: views, buffers: [{ byteLength: bin.byteLength }], ...extra };
  let json = new TextEncoder().encode(JSON.stringify(gltf));
  const jsonPad = (4 - (json.byteLength % 4)) % 4; if (jsonPad) { const j = new Uint8Array(json.byteLength + jsonPad).fill(0x20); j.set(json); json = j; }
  const total = 12 + 8 + json.byteLength + 8 + bin.byteLength;
  const out = new Uint8Array(total); const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, total, true);
  view.setUint32(12, json.byteLength, true); view.setUint32(16, 0x4e4f534a, true); out.set(json, 20);
  const binAt = 20 + json.byteLength; view.setUint32(binAt, bin.byteLength, true); view.setUint32(binAt + 4, 0x004e4942, true); out.set(bin, binAt + 8);
  return out;
}
