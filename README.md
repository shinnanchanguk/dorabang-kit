# 도라방 만들기 도구 (dorabang-kit)

도름스쿨의 **도라방**(선생님마다 하나인 교실 라이브 방)을 선생님이 자기 AI(Claude, Codex 등)와 함께 꾸미고
도름스에 보내는 도구예요. 도름스 '내 도라방'에서 복사한 안내문이 이 도구를 실행해요.

## 쓰는 법

```bash
npx -y <이 도구의 주소> init my-dorabang
cd my-dorabang && npm install
# .env.example 을 .env 로 복사하고 DORMS_DORABANG_KEY 에 도름스에서 받은 열쇠를 넣어요.
npm run preview   # 브라우저 미리보기(둘러보기 · 걸어보기 · 위에서 보기 · 연출 보기)
npm run check     # 도름스와 같은 규칙으로 검사
npm run send      # 도름스에 보내기
```

만들어진 폴더의 `README.md` 와 `AGENTS.md` 에 나머지 순서가 있어요. AI 는 `AGENTS.md` 의 설문 순서대로 선생님께 하나씩 물어요.

## 무엇을 보내나

도라방은 **데이터만** 보내요. 교실 안쪽 3D 모양(`room.glb`), 기능 자리 이름표(`dorabang.json`), 대표 그림(`preview.webp`),
선택으로 나만의 연출 모양(`effect.glb`). 스크립트·소리·바깥 주소는 넣을 수 없고, 도름스 서버가 같은 규칙으로 다시 검사해요.
보낸 도라방은 도름스 운영자가 확인한 뒤 '라이브 채널'에 "@닉네임 쌤의 도라방"으로 열려요.

## 개발

- `npm test`: 검사 규칙 시험
- 도름스 서버의 검사(`src/lib/school3d/dorabangSpec.ts` · `dorabangFile.ts`)가 바뀌면 `template/scripts/lib/rules.js` 를 같이 바꿔요.
  `npm run check` 가 도름스의 `/api/school/dorabang/rules` 와 숫자를 대조해 어긋나면 알려 줘요.

## 라이선스

MIT (`LICENSE`).
