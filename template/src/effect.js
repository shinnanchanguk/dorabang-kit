// (선택) 출석 연출에 쓸 나만의 모양. 움직이지 않는 작은 3D 모양 하나를 돌려주면, 도름스가 고른 움직임(rain · burst · rise · spin)으로 띄운다.
// 가운데가 원점이고 1m 상자 안에 들어가야 한다(면 5천 개, 그림 2장 이하). 쓰지 않으려면 null 을 돌려준다.
import { THREE, mat } from "./helpers.js";

export function buildEffect() {
  // 예시: 노란 별 하나. 쓰지 않으려면 아래 두 줄을 지우고 return null; 로 바꾼다.
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mat("#f2c14e", { emissive: "#f2c14e" }));
  return star;
}
