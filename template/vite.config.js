import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const DIST = resolve(ROOT, "dist");
// The only files the preview page may write, with their size caps (the check enforces the real limits).
const SAVE = new Map([["room.glb", 9 * 1024 * 1024], ["effect.glb", 512 * 1024], ["preview.webp", 1024 * 1024], ["dorabang.json", 64 * 1024]]);

/** Lets the "저장" button write into dist/. Local only. */
function dorabangKit() {
  return {
    name: "dorabang-kit",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const kitRoute = url.pathname === "/__kit/save";
        // Only this computer's own address may use these routes (blocks DNS rebinding from other sites).
        const hostName = (() => { try { return new URL(`http://${req.headers.host ?? ""}`).hostname; } catch { return ""; } })();
        if (kitRoute && !["127.0.0.1", "localhost", "[::1]"].includes(hostName)) { res.statusCode = 403; res.end(); return; }
        if (url.pathname === "/__kit/save") {
          const host = req.headers.host;
          let originHost = "";
          try { originHost = new URL(req.headers.origin ?? "").host; } catch { /* missing or "null" origin */ }
          const name = url.searchParams.get("file") ?? "";
          if (req.method !== "POST" || !originHost || originHost !== host || !SAVE.has(name)) { res.statusCode = 403; res.end(); return; }
          const limit = SAVE.get(name);
          const chunks = []; let size = 0, tooBig = false;
          req.on("data", (chunk) => { size += chunk.length; if (size > limit) { if (!tooBig) { tooBig = true; res.statusCode = 413; res.end(); req.destroy(); } } else chunks.push(chunk); });
          req.on("end", () => {
            if (tooBig) return;
            mkdirSync(DIST, { recursive: true });
            const target = resolve(DIST, name), temp = `${target}.part`;
            writeFileSync(temp, Buffer.concat(chunks)); renameSync(temp, target);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, file: `dist/${name}`, bytes: size }));
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [dorabangKit()],
  // Opens the browser so the teacher can look. Set DORABANG_NO_OPEN=1 to skip (for example on a server).
  server: { host: "127.0.0.1", port: 5240, strictPort: false, open: !process.env.DORABANG_NO_OPEN && !process.env.CI },
  clearScreen: false,
  logLevel: "info",
});
