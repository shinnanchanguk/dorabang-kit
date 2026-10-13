// AI 가 고치는 파일(이 파일과 src/effect.js 두 개뿐). 교실 안쪽을 꾸미고, 기능 자리 이름표(anchors)를 함께 돌려준다.
// 교실 틀(바닥·벽·천장·출입문)은 도름스가 그린다. 여기서는 안쪽만 만든다.
// 좌표: 가운데가 원점, 가로 x ∈ [-4.5, 4.5], 세로 z ∈ [-3.75, 3.75], 높이 y ∈ [0, 3]. 앞벽(+z) 오른쪽에 출입문이 있다.
// 출입문 앞(x 2.9~3.9, z 2.75~3.75)과 시작 자리((3.4, 2.9) 둘레 0.6m)는 비워 둔다.
import { chair, desk, lamp, plant, rug, seatGrid, shelf, wallPanel, THREE } from "./helpers.js";

/** 도라방 소개 한 줄(80자 이하). 채널 목록에 이름 아래 보인다. */
export const intro = "함께 공부하고 연수를 나누는 따뜻한 교실이에요.";

export function buildRoom() {
  const room = new THREE.Group();

  // 1) 발표 스크린: 뒷벽 가운데. 화면 공유가 이 판 안에 비친다.
  const screen = { center: [0, 1.6, -3.68], width: 3.2, height: 1.8, yaw: 0 };
  room.add(wallPanel(screen, { color: "#1f2326", frame: "#c9a66b" }));

  // 2) 방송 제목 전광판: 스크린 위.
  const titleBoard = { center: [0, 2.72, -3.68], width: 3.2, height: 0.4, yaw: 0 };
  room.add(wallPanel(titleBoard, { color: "#2f4a3a", frame: "#c9a66b" }));

  // 3) 발표자 자리: 스크린 왼쪽 앞. 발표 탁자 옆에 선다.
  const presenter = { pos: [-2.2, 0, -2.6], yaw: 0.4 };
  room.add(desk({ x: -2.9, z: -2.9, yaw: 0.4, w: 1.0 }));

  // 4) MC·부방장 의자 두 개: 스크린 오른쪽 앞, 청중 쪽을 비스듬히 본다.
  const mcSeats = [{ pos: [2.3, 0, -2.6], yaw: -0.5 }, { pos: [3.1, 0, -2.2], yaw: -0.7 }];
  for (const seat of mcSeats) room.add(chair({ x: seat.pos[0], z: seat.pos[2], yaw: seat.yaw, color: "#c46b4a" }));

  // 5) 청중 좌석: 스크린을 보고 앉는 15석(3줄 × 5석). 의자 사이와 줄 사이로 걸어 다닐 수 있다.
  const { group: audience, seats } = seatGrid({ rows: 3, cols: 5, x0: -2.4, z0: -0.9, dx: 1.2, dz: 1.15, yaw: Math.PI });
  room.add(audience);
  room.add(rug({ x: 0, z: 0.25, w: 6, d: 3.6, color: "#d9c7a7" }));

  // 6) 도름네이션 알림판: 뒷벽 왼쪽. 받은 도름네이션이 여기에 뜬다.
  const donationBoard = { center: [-3.5, 1.7, -3.68], width: 1.3, height: 0.8, yaw: 0 };
  room.add(wallPanel(donationBoard, { color: "#3b2f4a", frame: "#c9a66b" }));

  // 꾸밈: 왼쪽 벽 책장, 구석 화분, 천장 조명.
  room.add(shelf({ x: -4.3, z: 1.2, yaw: Math.PI / 2 }));
  room.add(plant({ x: -4.1, z: -3.3 }));
  room.add(plant({ x: 4.1, z: -3.3, size: 0.9 }));
  for (const [x, z] of [[-2, -1.5], [2, -1.5], [-2, 1.5], [2, 1.5]]) room.add(lamp({ x, z }));

  const anchors = {
    version: 1,
    screen, presenter, mcSeats, seats, titleBoard,
    // 출석 연출: 5·20·60분을 머문 선생님이 폭죽을 쏘면 이 자리에서 터진다. rain · burst · rise · spin 가운데 하나.
    attendance: { pos: [0, 2.4, -0.8], effect: "rain" },
    // 도름네이션 연출과 알림판.
    donation: { pos: [0, 2.2, -2.6], effect: "burst", board: donationBoard },
    // 조명: day(낮) · warm(따뜻한 저녁) · night(밤).
    light: "warm",
  };
  return { room, anchors };
}
