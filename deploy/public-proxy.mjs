import http from "node:http"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

const PORT = Number(process.env.PORT || 8080)
const DIST = process.env.ASSIST_DIST || "/Users/lqyyq/Desktop/opencode-assist/opencode/packages/app/dist"
const UPSTREAM = { host: "127.0.0.1", port: 4096 }
const USER = process.env.ASSIST_USER || "opencode"
const PASS = process.env.OPENCODE_PASSWORD || "opencode12345"
const SERVER_AUTH = "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64")
const COOKIE = "assist_session"
const TOKEN = crypto.createHash("sha256").update(PASS + "|assist-cookie-v1").digest("hex")

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
}

function cookies(req) {
  const out = new Map()
  for (const part of (req.headers.cookie || "").split(";")) {
    const index = part.indexOf("=")
    if (index > 0) out.set(part.slice(0, index).trim(), part.slice(index + 1).trim())
  }
  return out
}

function authorized(req) {
  return cookies(req).get(COOKIE) === TOKEN
}

function safeNext(input) {
  if (!input || !input.startsWith("/") || input.startsWith("//")) return "/assist/agent"
  return input
}

function loginPage(next, error) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sign in · OpenCode Assist</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    background: #070b12;
    color: #e7ecf5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
    display: flex;
    min-height: 100dvh;
  }
  .shell { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(420px, .85fr); width: 100%; min-height: 100dvh; }
  .brand {
    position: relative;
    overflow: hidden;
    padding: 52px 56px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background:
      radial-gradient(900px 520px at 18% 12%, rgba(78, 124, 255, .22), transparent 62%),
      radial-gradient(700px 520px at 85% 85%, rgba(168, 85, 247, .16), transparent 60%),
      linear-gradient(155deg, #0b1220 0%, #070b12 70%);
    border-right: 1px solid #1b2739;
  }
  .brand::after {
    content: "";
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(126, 154, 200, .06) 1px, transparent 1px), linear-gradient(90deg, rgba(126, 154, 200, .06) 1px, transparent 1px);
    background-size: 44px 44px;
    mask-image: radial-gradient(700px 500px at 30% 25%, black, transparent 80%);
    pointer-events: none;
  }
  .wordmark { display: flex; align-items: center; gap: 12px; font-weight: 650; letter-spacing: -.02em; font-size: 18px; position: relative; z-index: 1; }
  .mark { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: linear-gradient(145deg, #7aa2ff, #3f6bff); color: #06101f; font-weight: 800; }
  .hero { position: relative; z-index: 1; max-width: 520px; }
  .hero .eyebrow { color: #8ea4c8; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; margin-bottom: 18px; }
  .hero h2 { font-size: clamp(34px, 4vw, 58px); line-height: 1.03; letter-spacing: -.04em; margin: 0 0 20px; font-weight: 650; }
  .hero p { color: #97a7c0; font-size: 15px; line-height: 1.7; margin: 0; max-width: 440px; }
  .foot { color: #5d6d86; font-size: 12px; position: relative; z-index: 1; }
  .panel { display: flex; align-items: center; justify-content: center; padding: 40px 32px; background: #080d16; }
  .card { width: 100%; max-width: 380px; }
  .card h1 { font-size: 26px; letter-spacing: -.03em; margin: 0 0 8px; font-weight: 650; }
  .card .sub { color: #8d9db6; font-size: 13px; line-height: 1.6; margin: 0 0 26px; }
  label { display: block; font-size: 12px; color: #a9b8cf; margin: 0 0 8px; }
  .field { position: relative; }
  input[type=password], input[type=text] {
    width: 100%; height: 48px; border-radius: 10px; border: 1px solid #24344d; background: #0d1624; color: #eef3fb; caret-color: #7aa2ff; padding: 0 48px 0 14px; font-size: 15px; outline: none; transition: border-color .15s, box-shadow .15s;
  }
  input:focus { border-color: #5b86ff; box-shadow: 0 0 0 3px rgba(91, 134, 255, .16); }
  .eye { position: absolute; top: 0; right: 0; width: 48px; height: 48px; border: 0; background: transparent; color: #7f91ab; display: grid; place-items: center; cursor: pointer; border-radius: 0 10px 10px 0; }
  .eye:hover { color: #dbe6f8; background: rgba(255,255,255,.04); }
  .eye svg { width: 19px; height: 19px; }
  .eye .off { display: none; }
  .eye.showing .on { display: none; }
  .eye.showing .off { display: block; }
  button.submit { width: 100%; height: 48px; margin-top: 16px; border: 0; border-radius: 10px; background: linear-gradient(180deg, #6f98ff, #4874f5); color: #06101f; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 26px rgba(72, 116, 245, .28); }
  button.submit:hover { filter: brightness(1.05); }
  .error { display: ${error ? "block" : "none"}; margin: 0 0 16px; padding: 10px 12px; border-radius: 9px; background: rgba(255, 92, 92, .1); border: 1px solid rgba(255, 92, 92, .28); color: #ffb3b3; font-size: 12.5px; }
  .hint { margin: 18px 0 0; color: #62738c; font-size: 11.5px; line-height: 1.6; }
  .hint a { color: #9db8ff; text-decoration: none; }
  @media (max-width: 860px) {
    .shell { grid-template-columns: 1fr; }
    .brand { display: none; }
    .panel { min-height: 100dvh; }
  }
</style>
</head>
<body>
  <main class="shell">
    <section class="brand">
      <div class="wordmark"><span class="mark">A</span> OpenCode Assist</div>
      <div class="hero">
        <div class="eyebrow">Private workspace</div>
        <h2>Build at the<br/>speed of thought.</h2>
        <p>Sign in to open your Assist workspace: onboarding, real agent sessions, tools and approvals — all in one place.</p>
      </div>
      <div class="foot">OpenCode Assist · protected workspace</div>
    </section>
    <section class="panel">
      <form class="card" method="post" action="/login">
        <h1>Welcome back</h1>
        <p class="sub">Enter the workspace password to continue.</p>
        <div class="error" role="alert">${error ? "That password is not correct. Try again." : ""}</div>
        <input type="hidden" name="next" value="${next.replace(/"/g, "&quot;")}" />
        <label for="password">Password</label>
        <div class="field">
          <input id="password" name="password" type="password" autocomplete="current-password" autofocus required placeholder="Enter password" />
          <button type="button" class="eye" id="eye" aria-label="Show password" title="Show password">
            <svg class="on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg class="off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 6.1A10.9 10.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17.8 17.8 0 0 1-3.2 3.8"/><path d="M6.2 6.2C3.9 7.9 2.5 12 2.5 12s3.5 6 9.5 6c1.3 0 2.5-.3 3.6-.7"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
          </button>
        </div>
        <button class="submit" type="submit">Enter workspace</button>
        <p class="hint">Protected workspace · <a href="/logout">Sign out</a></p>
      </form>
    </section>
  </main>
  <script>
    (function () {
      var input = document.getElementById('password');
      var eye = document.getElementById('eye');
      eye.addEventListener('click', function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        eye.classList.toggle('showing', show);
        eye.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        eye.setAttribute('title', show ? 'Hide password' : 'Show password');
        var end = input.value.length;
        input.focus({ preventScroll: true });
        try { input.setSelectionRange(end, end); } catch (e) { /* ignore */ }
      });
    })();
  </script>
</body>
</html>`
}

function readBody(req, limit = 8192) {
  return new Promise((resolve) => {
    let body = ""
    req.on("data", (chunk) => {
      body += chunk
      if (body.length > limit) req.destroy()
    })
    req.on("end", () => resolve(body))
    req.on("error", () => resolve(""))
  })
}

function eventProxy(req, res) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    "connection": "keep-alive",
    "x-accel-buffering": "no",
  })
  res.flushHeaders()
  res.socket?.setNoDelay(true)
  res.write('data: {"id":"evt_proxy_connected","type":"server.connected","data":{}}\n\n')
  const upstream = http.request(
    {
      host: UPSTREAM.host,
      port: UPSTREAM.port,
      method: "GET",
      path: req.url,
      headers: { ...req.headers, host: `${UPSTREAM.host}:${UPSTREAM.port}`, authorization: SERVER_AUTH },
    },
    (response) => {
      response.on("data", (chunk) => {
        if (!res.writableEnded) res.write(chunk)
      })
    },
  )
  upstream.on("error", () => {})
  upstream.end()
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(": heartbeat\n\n")
  }, 15000)
  req.on("close", () => {
    clearInterval(heartbeat)
    upstream.destroy()
    if (!res.writableEnded) res.end()
  })
}

function proxy(req, res) {
  const upstream = http.request(
    {
      host: UPSTREAM.host,
      port: UPSTREAM.port,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        host: `${UPSTREAM.host}:${UPSTREAM.port}`,
        authorization: SERVER_AUTH,
      },
    },
    (response) => {
      const headers = { ...response.headers }
      if (req.url?.startsWith("/api/event")) {
        headers["cache-control"] = "no-cache, no-transform"
        headers["x-accel-buffering"] = "no"
        headers["connection"] = "keep-alive"
      }
      res.writeHead(response.statusCode || 502, headers)
      res.flushHeaders()
      res.socket?.setNoDelay(true)
      response.pipe(res)
    },
  )
  upstream.on("error", (error) => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" })
    res.end("OpenCode server unavailable: " + error.message)
  })
  req.pipe(upstream)
}

function serve(req, res, url) {
  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    pathname = "/"
  }
  let file = path.resolve(DIST, "." + pathname)
  if (!file.startsWith(DIST + path.sep)) file = path.join(DIST, "index.html")
  if (pathname === "/" || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST, "index.html")
  }
  const stat = fs.statSync(file)
  const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream"
  res.writeHead(200, {
    "content-type": type,
    "content-length": stat.size,
    "cache-control": file.endsWith(".html") ? "no-store" : "public, max-age=3600",
  })
  if (req.method === "HEAD") return res.end()
  fs.createReadStream(file).pipe(res)
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://localhost")
    if (url.pathname === "/login" && req.method === "GET") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" })
      return res.end(loginPage(safeNext(url.searchParams.get("next") || ""), url.searchParams.get("error") === "1"))
    }
    if (url.pathname === "/login" && req.method === "POST") {
      const body = new URLSearchParams(await readBody(req))
      const next = safeNext(body.get("next") || "")
      if (body.get("password") === PASS) {
        res.writeHead(302, {
          location: next,
          "set-cookie": `${COOKIE}=${TOKEN}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`,
          "cache-control": "no-store",
        })
        return res.end()
      }
      res.writeHead(302, { location: `/login?error=1&next=${encodeURIComponent(next)}`, "cache-control": "no-store" })
      return res.end()
    }
    if (url.pathname === "/logout") {
      res.writeHead(302, {
        location: "/login",
        "set-cookie": `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
        "cache-control": "no-store",
      })
      return res.end()
    }
    if (!authorized(req)) {
      if (url.pathname.startsWith("/api/")) {
        res.writeHead(401, { "content-type": "application/json", "cache-control": "no-store" })
        return res.end(JSON.stringify({ error: "authentication required" }))
      }
      res.writeHead(302, { location: `/login?next=${encodeURIComponent(req.url || "/")}`, "cache-control": "no-store" })
      return res.end()
    }
    if (url.pathname === "/api/event") return eventProxy(req, res)
    if (url.pathname.startsWith("/api/")) return proxy(req, res)
    return serve(req, res, url)
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`OpenCode Assist proxy on http://0.0.0.0:${PORT}`)
  })
