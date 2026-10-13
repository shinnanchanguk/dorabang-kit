import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAnchors, checkRoom, checkEffect, inClearZone } from "../template/scripts/lib/rules.js";
import { makeGlb } from "./glb.js";

const seats = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) seats.push({ pos: [-2.4 + c * 1.2, 0, -0.9 + r * 1.15], yaw: Math.PI });
const anchors = {
  version: 1,
  screen: { center: [0, 1.6, -3.68], width: 3.2, height: 1.8, yaw: 0 },
  presenter: { pos: [-2.2, 0, -2.6], yaw: 0.4 },
  mcSeats: [{ pos: [2.3, 0, -2.6], yaw: -0.5 }, { pos: [3.1, 0, -2.2], yaw: -0.7 }],
  seats,
  titleBoard: { center: [0, 2.72, -3.68], width: 3.2, height: 0.4, yaw: 0 },
  attendance: { pos: [0, 2.4, -0.8], effect: "rain" },
  donation: { pos: [0, 2.2, -2.6], effect: "burst", board: { center: [-3.5, 1.7, -3.68], width: 1.3, height: 0.8, yaw: 0 } },
  light: "warm",
};
const chairs = seats.map((s) => ({ min: [s.pos[0] - 0.23, 0, s.pos[2] - 0.22], max: [s.pos[0] + 0.23, 0.9, s.pos[2] + 0.22] }));

test("example anchors have every feature", () => {
  assert.deepEqual(checkAnchors(anchors), []);
});
test("missing features are named", () => {
  const { screen, ...rest } = anchors;
  assert.ok(checkAnchors(rest).some((p) => p.includes("발표 스크린")));
  assert.ok(checkAnchors({ ...anchors, seats: seats.slice(0, 5) }).some((p) => p.includes("12석")));
});
test("a room inside the shell passes", () => {
  const result = checkRoom(makeGlb([...chairs, { min: [-1.66, 0.64, -3.74], max: [1.66, 2.56, -3.7] }]), anchors);
  assert.equal(result.ok, true, result.reason);
});
test("parts outside the shell fail", () => {
  const result = checkRoom(makeGlb([...chairs, { min: [4.4, 0, 0], max: [4.8, 1, 0.5] }]), anchors);
  assert.equal(result.ok, false); assert.match(result.reason, /교실 틀/);
});
test("the door and the start spot stay clear", () => {
  assert.equal(inClearZone(3.4, 3.2), true);
  const result = checkRoom(makeGlb([...chairs, { min: [3.2, 0, 3.0], max: [3.6, 1, 3.3] }]), anchors);
  assert.equal(result.ok, false); assert.match(result.reason, /출입문|시작 자리/);
});
test("a wall that blocks the way to the seats fails", () => {
  const wall = { min: [-4.5, 0, 2.2], max: [2.7, 2, 2.4] }, wall2 = { min: [2.7, 0, 2.2], max: [4.5, 2, 2.3] };
  const result = checkRoom(makeGlb([...chairs, wall, wall2]), anchors);
  assert.equal(result.ok, false); assert.match(result.reason, /걸어갈 길/);
});
test("an effect shape must fit a 1m box", () => {
  assert.equal(checkEffect(makeGlb([{ min: [-0.2, -0.2, -0.2], max: [0.2, 0.2, 0.2] }])).ok, true);
  assert.equal(checkEffect(makeGlb([{ min: [-0.8, -0.2, -0.2], max: [0.8, 0.2, 0.2] }])).ok, false);
});
test("animations and outside files are refused", () => {
  assert.match(checkRoom(makeGlb(chairs, { extra: { animations: [{ channels: [], samplers: [] }] } }), anchors).reason, /움직임/);
  assert.match(checkRoom(makeGlb(chairs, { extra: { images: [{ uri: "https://example.com/a.png" }] } }), anchors).reason, /그림/);
});

/** 만든 .glb 뒤에 덩어리를 하나 더 붙인다(길이 머리글도 맞춘다). */
function appendChunk(glb, type, data) {
  const padded = new Uint8Array(Math.ceil(data.byteLength / 4) * 4); padded.set(data);
  const out = new Uint8Array(glb.byteLength + 8 + padded.byteLength);
  out.set(glb);
  const view = new DataView(out.buffer);
  view.setUint32(8, out.byteLength, true);
  view.setUint32(glb.byteLength, padded.byteLength, true);
  view.setUint32(glb.byteLength + 4, type, true);
  out.set(padded, glb.byteLength + 8);
  return out;
}
test("same refusals as the server: extra blocks, sheared matrix, normalized 1, odd tables", () => {
  const honest = makeGlb(chairs);
  assert.equal(checkRoom(honest, anchors).ok, true);
  const twoBins = checkRoom(appendChunk(honest, 0x004e4942, new Uint8Array(16)), anchors);
  assert.equal(twoBins.ok, false);
  assert.match(twoBins.reason, /덧붙어/);
  assert.equal(checkRoom(appendChunk(honest, 0x4e4f534a, new TextEncoder().encode("{}  ")), anchors).ok, false);
  assert.equal(checkRoom(makeGlb(chairs, { mutate: (g) => { g.nodes[0].matrix = [1, 0, -0.42, 0, 0, 1, 0, 0, -1.39, 0, 1, 0, 0, 0, 0, 1]; } }), anchors).ok, false);
  assert.equal(checkRoom(makeGlb(chairs, { mutate: (g) => { g.accessors[0].normalized = 1; } }), anchors).ok, false);
  assert.equal(checkRoom(makeGlb(chairs, { mutate: (g) => { g.scenes.push({ nodes: [] }); } }), anchors).ok, false);
  assert.equal(checkRoom(makeGlb(chairs, { mutate: (g) => { g.bufferViews.push(null); } }), anchors).ok, false);
  assert.equal(checkRoom(makeGlb(chairs, { mutate: (g) => { g.skins = { 0: { joints: [0] } }; } }), anchors).ok, false, "skins as object");
  assert.equal(checkRoom(makeGlb(chairs, { mutate: (g) => { g.meshes[0].primitives[0].attributes.Position = g.meshes[0].primitives[0].attributes.POSITION; } }), anchors).ok, false, "attribute alias");
});
