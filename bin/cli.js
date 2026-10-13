#!/usr/bin/env node
// dorabang-kit init <폴더>: template/ 를 새 폴더로 복사한다. 다른 일은 하지 않는다.
import { cpSync, existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const TEMPLATE = resolve(KIT, "template");

const NOTICE = `[알림]
- 이 도구의 코드는 MIT 라이선스예요.
- 남의 캐릭터·상표·로고를 베낀 모양이나 그림은 넣지 마세요.
- 보낸 도라방은 도름스 운영자가 확인한 뒤 열려요. 열린 도라방은 도름스 회원 누구나 들어가 볼 수 있어요.`;

function usage() {
  console.log(`도라방 만들기 도구

쓰는 법:
  npx -y <도구 주소> init <폴더 이름>

폴더를 만든 뒤 그 안의 README.md 와 AGENTS.md 를 읽고 따라 주세요.

${NOTICE}`);
}

function init(target) {
  if (!target) { console.log("만들 폴더 이름을 적어 주세요. 예: init my-dorabang"); process.exitCode = 1; return; }
  const dir = resolve(process.cwd(), target);
  if (existsSync(dir) && (!statSync(dir).isDirectory() || readdirSync(dir).length)) {
    console.log(`${target} 폴더가 이미 있고 비어 있지 않아요. 다른 이름을 쓰거나 빈 폴더를 골라 주세요.`);
    process.exitCode = 1; return;
  }
  cpSync(TEMPLATE, dir, { recursive: true, errorOnExist: true, force: false, filter: (src) => !/[\\/](node_modules|dist)([\\/]|$)/.test(src.slice(TEMPLATE.length)) });
  // npm 은 .gitignore 같은 점 파일을 꾸러미에서 빼므로 밑줄을 붙여 옮긴다.
  for (const [from, to] of [["_gitignore", ".gitignore"], ["_env.example", ".env.example"]]) {
    if (existsSync(resolve(dir, from))) renameSync(resolve(dir, from), resolve(dir, to));
  }
  const pkgPath = resolve(dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.name = (basename(dir).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "my-dorabang").slice(0, 60);
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`${target} 폴더를 만들었어요.

다음 순서:
  1. cd ${target}
  2. npm install
  3. README.md 와 AGENTS.md 를 끝까지 읽기
  4. npm run preview  (브라우저에서 교실을 둘러보고 걸어 봐요)
  5. src/room.js 를 고쳐 교실 꾸미기, 미리보기에서 '저장'
  6. npm run check 로 검사, npm run send 로 보내기

${NOTICE}`);
}

const [command, target] = process.argv.slice(2);
if (command === "init") init(target);
else usage();
