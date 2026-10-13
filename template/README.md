# 내 도라방 꾸미기

도름스쿨의 도라방(선생님마다 하나인 교실 라이브 방)을 AI 와 함께 꾸미는 작업 폴더예요.
AI 는 `AGENTS.md` 를 먼저 읽고, 선생님께 하나씩 물어 가며 교실을 꾸며요.

```bash
npm install
# .env.example 을 .env 로 복사하고 DORMS_DORABANG_KEY 에 도름스에서 받은 열쇠를 넣어요.
npm run preview   # 브라우저에서 교실을 둘러보고 걸어 봐요
npm run check     # 도름스와 같은 규칙으로 검사
npm run send      # 도름스에 보내기
npm run status    # 상태와 운영자 메모 보기
```

| 파일 | 내용 |
|---|---|
| `src/room.js` | 교실 안쪽 꾸밈과 기능 자리(AI 가 고치는 파일) |
| `src/effect.js` | (선택) 나만의 출석 연출 모양 |
| `src/helpers.js` | 의자·좌석 묶음·벽 판·책상·책장·화분·깔개·조명 도구 |
| `scripts/lib/rules.js` | 도름스 서버와 같은 검사 규칙 |
