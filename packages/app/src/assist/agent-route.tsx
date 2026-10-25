import { createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import { useServers } from "@/runtime/server/registry"

type SessionOption = { id: string; title: string; time_updated: number }
type AssistSettings = {
  policy?: { categories?: Record<string, string> }
  state?: { identity?: string; capLevel?: string; explainStyle?: string; budget?: number }
}

function ensureLocalIcons(event: Event) {
  const doc = (event.currentTarget as HTMLIFrameElement).contentDocument

  if (!doc || doc.getElementById("oc-local-fontawesome")) return

  const link = doc.createElement("link")
  link.id = "oc-local-fontawesome"
  link.rel = "stylesheet"
  const local = location.hostname === "localhost" || location.hostname === "127.0.0.1" || !/^https?:$/.test(location.protocol)
  link.href = local
    ? "/assist-assets/fontawesome/css/all.min.css"
    : "https://opencode-assist-assets.surge.sh/fontawesome/css/all-embedded.css"
  doc.head.appendChild(link)
}

/**
 * Runs inside the demo iframe. It keeps every visual element and animation of the demo and only swaps the
 * transport: the composer's game-demo script is replaced by the real OpenCode session stream.
 */
function assistBridge() {
  const win = window as any
  const post = (type: string, payload?: any) => win.parent.postMessage({ source: "assist-bridge", type, ...payload }, "*")
  const chat = () => document.getElementById("oc-chat")
  const input = () => document.getElementById("oc-input") as HTMLTextAreaElement | null
  const send = () => document.getElementById("oc-btn-send") as HTMLButtonElement | null
  const esc = (value: any) => (win.escapeHtml ? win.escapeHtml(String(value ?? "")) : String(value ?? ""))
  let activeId: string | null = null

  try {
    const style = document.createElement("style")
    style.id = "assist-markdown-style"
    style.textContent = `
      .oc-msg-text.oc-md { white-space: normal; line-height: 1.72; }
      .oc-msg-text.oc-md p { margin: 0 0 10px; }
      .oc-msg-text.oc-md h1 { font-size: 18px; line-height: 1.35; font-weight: 650; margin: 4px 0 10px; color: #F2F6FC; }
      .oc-msg-text.oc-md h2 { font-size: 16px; line-height: 1.4; font-weight: 650; margin: 18px 0 8px; color: #F2F6FC; }
      .oc-msg-text.oc-md h3 { font-size: 14.5px; line-height: 1.45; font-weight: 650; margin: 14px 0 6px; color: #EAF1FB; }
      .oc-msg-text.oc-md h4 { font-size: 13.5px; line-height: 1.45; font-weight: 650; margin: 12px 0 6px; color: #EAF1FB; }
      .oc-msg-text.oc-md ul, .oc-msg-text.oc-md ol { margin: 4px 0 12px 20px; padding: 0; }
      .oc-msg-text.oc-md li { margin: 4px 0; padding-left: 2px; }
      .oc-msg-text.oc-md strong { color: #F5F8FD; font-weight: 650; }
      .oc-msg-text.oc-md em { color: #DCE7F8; }
      .oc-msg-text.oc-md code { font-family: var(--font-family-mono, monospace); font-size: 12px; background: #0D1624; border: 1px solid #24344D; border-radius: 5px; padding: 1px 5px; color: #CFE0FF; }
      .oc-msg-text.oc-md pre { margin: 8px 0 12px; padding: 10px 12px; background: #0A111D; border: 1px solid #22304A; border-radius: 8px; overflow-x: auto; }
      .oc-msg-text.oc-md pre code { border: 0; background: transparent; padding: 0; font-size: 12px; line-height: 1.6; }
      .oc-msg-text.oc-md blockquote { margin: 8px 0 12px; padding: 4px 0 4px 12px; border-left: 2px solid #3E5B86; color: #A9BBD5; }
      .oc-msg-text.oc-md hr { border: 0; border-top: 1px solid #22304A; margin: 14px 0; }
      .oc-msg-text.oc-md a { color: #8FB4FF; text-decoration: underline; text-underline-offset: 2px; }
      .oc-md-caret { display: inline-block; width: 7px; height: 14px; margin-left: 2px; vertical-align: -2px; background: #7AA2FF; border-radius: 1px; animation: ocMdCaret 900ms steps(1) infinite; }
      @keyframes ocMdCaret { 50% { opacity: 0; } }
    `
    document.head.appendChild(style)
  } catch (e) { /* ignore */ }

  function enable(on: boolean) {
    const i = input()
    const s = send()
    if (i) i.disabled = !on
    if (s) s.disabled = !on
  }

  function clear() {
    const c = chat()
    if (c) c.innerHTML = ""
    if (thinkTimer) clearInterval(thinkTimer)
    thinkTimer = null
    thinkBox = null
    streams.forEach((state) => { if (state.timer) clearTimeout(state.timer) })
    streams.clear()
    clearTyping()
    activeId = null
    win.permPending = null
    const overlay = document.getElementById("perm-overlay")
    if (overlay) overlay.classList.remove("active")
  }

  function setTitle(title: string) {
    const el = document.getElementById("oc-session-title")
    if (el) el.textContent = title || "New Session"
  }

  let realStats = ""

  function setStats(text: string) {
    realStats = text
    const el = document.getElementById("oc-stats")
    if (el && el.textContent !== text) el.textContent = text
  }

  function sessions(list: SessionOption[]) {
    const el = document.getElementById("oc-session-list")
    if (!el) return
    el.innerHTML = (list || [])
      .slice(0, 12)
      .map((s) => {
        const active = s.id === activeId ? " active" : ""
        return (
          '<button type="button" class="oc-session' +
          active +
          '" data-assist-session="' +
          esc(s.id) +
          '"><span class="oc-session-title">' +
          esc(s.title || "Untitled") +
          '</span><span class="oc-session-time">' +
          (win.relativeTime ? win.relativeTime(s.time_updated) : "") +
          "</span></button>"
        )
      })
      .join("")
    el.querySelectorAll("[data-assist-session]").forEach((button: any) => {
      button.addEventListener("click", () => {
        el.querySelectorAll(".oc-session").forEach((item: any) => item.classList.remove("active"))
        button.classList.add("active")
        activeId = button.getAttribute("data-assist-session")
        const title = button.querySelector(".oc-session-title")?.textContent || "Session"
        setTitle(title)
        clear()
        activeId = button.getAttribute("data-assist-session")
        post("select-session", { sessionID: activeId })
      })
    })
  }

  function currentSettings() {
    try {
      const policy = win.riskPolicyGet ? win.riskPolicyGet() : null
      const state = win.state
      return {
        policy,
        state: state
          ? { identity: state.identity, capLevel: state.capLevel, explainStyle: state.explainStyle, budget: state.budget }
          : null,
      }
    } catch (e) {
      return null
    }
  }

  function plainTool(tool: any) {
    const name = String(tool.name || "tool")
    const input = tool.input ? String(tool.input).slice(0, 160) : ""
    if (name === "shell" || name === "bash") {
      return { icon: "fa-terminal", title: "Ran a command", detail: input || "Ran a command in your workspace." }
    }
    if (name === "write" || name === "edit" || name === "patch") {
      return { icon: "fa-pen-to-square", title: "Changed a file", detail: input || "Changed a project file." }
    }
    if (name === "read" || name === "grep" || name === "glob" || name === "list") {
      return { icon: "fa-file-lines", title: "Looked at your files", detail: input || "Read project context." }
    }
    if (name === "webfetch" || name === "websearch") {
      return { icon: "fa-globe", title: "Looked something up", detail: input || "Used the web." }
    }
    return { icon: "fa-circle-check", title: name, detail: input || "Ran " + name + "." }
  }

  function resetTrajectory(text: string) {
    if (!win.ocTrajReset) return
    win.ocTrajReset([
      {
        id: "request",
        icon: "fa-comment-dots",
        title: "Understood your request",
        detail: 'You asked: "' + text.slice(0, 160) + '". I will work through it step by step.',
        status: "done",
        meta: "just now",
      },
      {
        id: "think",
        icon: "fa-brain",
        title: "Thinking it through",
        detail: "Reading the workspace and planning the next step.",
        status: "active",
        meta: "working",
      },
    ])
  }

  let thinkBox: any = null
  let thinkTimer: any = null

  function startThinking() {
    if (thinkBox) return
    const c = chat()
    if (!c) return
    const box = document.createElement("div")
    box.className = "think-box"
    box.innerHTML =
      '<div class="think-header">' +
        '<span class="think-label">Thinking…</span>' +
        '<button type="button" class="think-chevron" aria-label="Expand thinking" aria-expanded="false" inert>' +
          '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>' +
        '</button>' +
      '</div>' +
      '<div class="think-stream"></div>' +
      '<div class="think-detail" style="display:none"></div>'
    c.appendChild(box)
    c.scrollTop = c.scrollHeight
    const label = box.querySelector(".think-label") as HTMLElement
    const stream = box.querySelector(".think-stream") as HTMLElement
    const detail = box.querySelector(".think-detail") as HTMLElement
    const chevron = box.querySelector(".think-chevron") as HTMLElement
    const phrases = (win.THINK_PHRASES && win.THINK_PHRASES.length ? win.THINK_PHRASES : [
      "Reading your request…",
      "Checking the workspace…",
      "Planning the next steps…",
      "Preparing the tools…",
    ])
    let index = 0
    const show = () => {
      stream.textContent = phrases[index % phrases.length]
      index++
      stream.style.animation = "none"
      void stream.offsetWidth
      stream.style.animation = ""
    }
    show()
    thinkTimer = setInterval(show, 480)
    thinkBox = { box, label, stream, detail, chevron }
  }

  function setReasoning(reasoning: string) {
    if (!reasoning) return
    startThinking()
    if (!thinkBox) return
    thinkBox.detail.innerHTML = reasoning
      .split(/\n+/)
      .filter(Boolean)
      .map((line: string) => "<p>" + esc(line) + "</p>")
      .join("")
  }

  function finishThinking() {
    if (!thinkBox) return
    if (thinkTimer) clearInterval(thinkTimer)
    thinkTimer = null
    thinkBox.label.textContent = "Thought complete"
    thinkBox.stream.style.display = "none"
    thinkBox.chevron.removeAttribute("inert")
    thinkBox.chevron.onclick = function () { win.toggleThinkDetail(thinkBox.box) }
    thinkBox = null
  }

  function clearTyping() {
    document.querySelectorAll(".oc-typing").forEach((el) => el.remove())
    try {
      if (win.hideOcTyping) win.hideOcTyping()
    } catch (e) { /* ignore */ }
  }

  function inlineMarkdown(line: string) {
    let value = esc(line)
    value = value.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    value = value.replace(/`([^`]+)`/g, "<code>$1</code>")
    value = value.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    value = value.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>")
    return value
  }

  function renderMarkdown(source: string) {
    const lines = String(source || "").replace(/\r/g, "").split("\n")
    const out: string[] = []
    let list: "ul" | "ol" | null = null
    let code: string[] | null = null
    const closeList = () => {
      if (!list) return
      out.push("</" + list + ">")
      list = null
    }
    for (const raw of lines) {
      if (/^```/.test(raw.trim())) {
        if (code) {
          out.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>")
          code = null
        } else {
          closeList()
          code = []
        }
        continue
      }
      if (code) {
        code.push(raw)
        continue
      }
      const line = raw.replace(/\s+$/, "")
      const text = line.trim()
      if (!text) {
        closeList()
        continue
      }
      const heading = text.match(/^(#{1,4})\s+(.*)$/)
      if (heading) {
        closeList()
        const level = Math.min(4, heading[1].length)
        out.push("<h" + level + ">" + inlineMarkdown(heading[2]) + "</h" + level + ">")
        continue
      }
      if (/^[-*•]\s+/.test(text)) {
        if (list !== "ul") {
          closeList()
          out.push("<ul>")
          list = "ul"
        }
        out.push("<li>" + inlineMarkdown(text.replace(/^[-*•]\s+/, "")) + "</li>")
        continue
      }
      const numbered = text.match(/^\d+[.)]\s+(.*)$/)
      if (numbered) {
        if (list !== "ol") {
          closeList()
          out.push("<ol>")
          list = "ol"
        }
        out.push("<li>" + inlineMarkdown(numbered[1]) + "</li>")
        continue
      }
      if (/^>\s+/.test(text)) {
        closeList()
        out.push("<blockquote>" + inlineMarkdown(text.replace(/^>\s+/, "")) + "</blockquote>")
        continue
      }
      if (/^---+$/.test(text)) {
        closeList()
        out.push("<hr />")
        continue
      }
      closeList()
      out.push("<p>" + inlineMarkdown(line) + "</p>")
    }
    if (code) out.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>")
    closeList()
    return out.join("")
  }

  const streams = new Map<string, any>()

  function streamInto(id: string, el: HTMLElement, full: string, instant?: boolean) {
    let state = streams.get(id)
    if (!state) {
      state = { target: full, cursor: 0, timer: null as any, el }
      streams.set(id, state)
    }
    state.target = full
    state.el = el
    if (instant) {
      if (state.timer) clearTimeout(state.timer)
      state.timer = null
      state.cursor = full.length
      el.innerHTML = renderMarkdown(full)
      return
    }
    if (state.timer) return
    const tick = () => {
      const node = state.el as HTMLElement
      if (!node || !node.isConnected) {
        if (state.timer) clearTimeout(state.timer)
        state.timer = null
        streams.delete(id)
        return
      }
      const target = String(state.target || "")
      if (state.cursor > target.length) state.cursor = 0
      let next = target.indexOf("\n", state.cursor)
      if (next < 0 || next - state.cursor > 140) next = Math.min(target.length, state.cursor + 90)
      else next += 1
      state.cursor = Math.min(target.length, next)
      node.innerHTML = renderMarkdown(target.slice(0, state.cursor)) + (state.cursor < target.length ? '<span class="oc-md-caret"></span>' : "")
      const c = chat()
      if (c) c.scrollTop = c.scrollHeight
      if (state.cursor >= target.length && state.target.length === target.length) {
        state.timer = null
        return
      }
      state.timer = setTimeout(tick, 45)
    }
    state.timer = setTimeout(tick, 0)
  }

  function assistant(message: any, instant?: boolean) {
    const c = chat()
    if (!c) return
    let el = c.querySelector('[data-assist-message="' + String(message.id).replace(/"/g, "") + '"]') as HTMLElement | null
    if (!el) {
      el = document.createElement("div")
      el.className = "oc-msg-assistant"
      el.setAttribute("data-assist-message", message.id)
      el.innerHTML =
        '<div class="oc-msg-meta">opencode · just now</div><div class="oc-msg-text oc-md"></div><div class="assist-tools"></div>'
      c.appendChild(el)
    }
    if (message.reasoning) {
      setReasoning(String(message.reasoning))
      if (win.ocTrajUpdate) {
        win.ocTrajUpdate("think", {
          detail: String(message.reasoning).split(/\n+/)[0].slice(0, 160),
          status: "done",
          meta: "thought",
        })
      }
    }
    const text = el.querySelector(".oc-msg-text") as HTMLElement | null
    if (text && (message.text || "")) {
      clearTyping()
      streamInto(String(message.id), text, String(message.text), instant)
    } else if (text && instant) {
      text.innerHTML = ""
    }
    const tools = el.querySelector(".assist-tools") as HTMLElement | null
    if (tools) {
      if ((message.tools || []).length) clearTyping()
      tools.innerHTML = ""
      ;(message.tools || []).forEach((tool: any) => {
        const row = win.ocToolBlock(tool.name || "tool", tool.status || "running")
        if (row) tools.appendChild(row)
        const plain = plainTool(tool)
        if (win.ocTrajAdd) {
          win.ocTrajAdd({
            id: "tool-" + (tool.id || tool.name),
            icon: plain.icon,
            title: plain.title,
            detail: plain.detail,
            status: tool.status === "completed" ? "done" : tool.status === "error" ? "denied" : "active",
            meta: tool.status || "working",
          })
        }
      })
    }
    c.scrollTop = c.scrollHeight
  }

  function history(items: any[]) {
    clear()
    ;(items || []).forEach((item) => {
      if (item.role === "user") {
        win.appendOcUser(item.text || "")
      } else if (item.role === "assistant") {
        assistant({ id: item.id, text: item.text, tools: item.tools }, true)
      }
    })
  }

  win.ocLoadSessions = function () {}
  win.renderOcSessions = function () {}

  win.ocSendMessage = function () {
    const i = input()
    if (!i) return
    const text = i.value.trim()
    if (!text) return
    win.appendOcUser(text)
    i.value = ""
    i.style.height = ""
    win.showOcTyping()
    enable(false)
    resetTrajectory(text)
    post("prompt", { text, settings: currentSettings() })
  }

  win.ocNewSession = function (event?: Event) {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    clear()
    setTitle("New Session")
    post("new-session")
  }

  win.ocSelectSession = function (button: any) {
    if (!button) return
    const id = button.getAttribute("data-assist-session")
    if (id) {
      activeId = id
      post("select-session", { sessionID: id })
    }
  }

  win.respondPermission = function (approve: boolean) {
    const request = win.permPending
    const overlay = document.getElementById("perm-overlay")
    if (overlay) overlay.classList.remove("active")
    win.permPending = null
    if (request) post("permission-reply", { requestId: request.requestId, approve: !!approve })
  }

  win.addEventListener("message", (event: MessageEvent) => {
    const data = event.data
    if (!data || data.source !== "assist-parent") return
    switch (data.type) {
      case "sessions": {
        sessions(data.sessions || [])
        if (data.stats) setStats(data.stats.sessions + " sessions · $" + Number(data.stats.cost || 0).toFixed(2))
        break
      }
      case "history":
        history(data.items || [])
        break
      case "assistant":
        assistant(data)
        break
      case "typing":
        startThinking()
        win.showOcTyping()
        break
      case "done":
        finishThinking()
        clearTyping()
        enable(true)
        if (win.ocTrajAdd) {
          win.ocTrajAdd({
            id: "reply",
            icon: "fa-robot",
            title: "Prepared your answer",
            detail: "Checked the result and put the reply together.",
            status: "done",
            meta: "done",
          })
        }
        break
      case "error": {
        finishThinking()
        clearTyping()
        enable(true)
        const c = chat()
        if (c) {
          const el = document.createElement("div")
          el.className = "oc-msg-system"
          el.textContent = String(data.message || "OpenCode request failed")
          c.appendChild(el)
          c.scrollTop = c.scrollHeight
        }
        break
      }
      case "permission":
        win.showPermDialog({
          requestId: data.requestId,
          sessionId: data.sessionID,
          actions: data.actions || [],
        })
        break
      case "permission-resolved": {
        const overlay = document.getElementById("perm-overlay")
        if (overlay) overlay.classList.remove("active")
        win.permPending = null
        break
      }
      case "usage": {
        if (win.ocUsage) {
          const total = Number(data.tokens || 0)
          win.ocUsage.tokens = total
          win.ocUsage.contextPct = Math.min(99, +(total / Math.max(1, win.ocUsage.contextWindow) * 100).toFixed(1))
          if (win.renderOcUsage) win.renderOcUsage()
        }
        break
      }
      case "clear":
        clear()
        setTitle("New Session")
        break
      case "title":
        setTitle(String(data.title || "Session"))
        break
    }
  })

  setInterval(function () {
    if (!realStats) return
    const el = document.getElementById("oc-stats")
    if (el && el.textContent !== realStats) el.textContent = realStats
  }, 800)

  const version = win.document.querySelector(".oc-version")
  if (version) version.textContent = "Assist"
  try {
    win.FAKE_SESSIONS = []
  } catch (e) { /* ignore */ }

  post("ready", { settings: currentSettings() })
  setTimeout(function () {
    post("refresh-sessions")
  }, 1400)
}


type SessionInfo = {
  id: string
  title?: string
  cost?: number
  tokens?: { input?: number; output?: number; reasoning?: number }
  time?: { updated?: number }
  location?: { directory?: string }
}

export function AssistAgentRoute() {
  const demoVersion = Math.random().toString(36).slice(2)
  const servers = useServers()
  const server = createMemo(() => {
    const origin = location.origin.replace(/\/+$/, "")
    return (
      servers.list.find((item: any) => item.http?.url && String(item.http.url).replace(/\/+$/, "") !== origin) ??
      servers.list[0]
    )
  })
  const [active, setActive] = createSignal<string>()
  const [bridgeReady, setBridgeReady] = createSignal(false)
  const [settings, setSettings] = createSignal<AssistSettings>()
  const [status, setStatus] = createSignal("connecting…")
  let frame: HTMLIFrameElement | undefined
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let demoAttempts = 0
  let running = false
  let posted = new Map<string, string>()
  let shown = new Set<string>()
  let lastSessions = ""

  const base = () => {
    const http = (server() as any)?.http
    return http?.url ? String(http.url).replace(/\/+$/, "") : ""
  }

  const authorization = () => {
    const http = (server() as any)?.http
    if (!http?.password) return undefined
    return "Basic " + btoa("opencode:" + http.password)
  }

  const api = async (path: string, init: RequestInit = {}) => {
    const root = base()
    if (!root) throw new Error("OpenCode server is not connected")
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) }
    const auth = authorization()
    if (auth) headers.Authorization = auth
    if (init.body) headers["Content-Type"] = "application/json"
    const response = await fetch(root + path, { ...init, headers })
    if (response.status === 401) {
      if (location.port === "8080" || location.hostname.endsWith("trycloudflare.com")) {
        location.assign("/login?next=" + encodeURIComponent(location.pathname + location.search))
        throw new Error("Your session expired. Redirecting to sign in…")
      }
      throw new Error("OpenCode authentication failed. Reconnect the server.")
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new Error(text || `OpenCode server returned ${response.status}`)
    }
    if (response.status === 204) return undefined
    return response.json()
  }

  const post = (message: any) => {
    if (!frame?.contentWindow) return
    frame.contentWindow.postMessage({ source: "assist-parent", ...message }, location.origin)
  }

  const sessions = async (): Promise<SessionInfo[]> => {
    const body = await api("/api/session?limit=50&order=desc")
    return Array.isArray(body?.data) ? body.data : []
  }

  const postSessions = async (force = false) => {
    if (!bridgeReady()) return
    try {
      const list = await sessions()
      const signature = JSON.stringify(list.map((s) => [s.id, s.title, s.time?.updated]))
      if (!force && signature === lastSessions) return
      lastSessions = signature
      post({
        type: "sessions",
        sessions: list.map((s) => ({ id: s.id, title: s.title || "Untitled", time_updated: s.time?.updated || Date.now() })),
        stats: { sessions: list.length, cost: list.reduce((total, s) => total + (s.cost || 0), 0) },
      })
    } catch (error) {
      // The next successful poll will update the list.
    }
  }

  const directory = () => {
    const fromQuery = new URLSearchParams(location.search).get("dir")
    if (fromQuery) return fromQuery
    const http = (server() as any)?.http
    if (http?.directory) return String(http.directory)
    return undefined
  }

  const permissionsFor = (input: AssistSettings | undefined) => {
    const categories = input?.policy?.categories || {}
    const strict = (...names: string[]) => {
      let effect = "ask"
      for (const name of names) {
        const value = categories[name] || "ask"
        if (value === "block") return "deny"
        if (value === "auto") continue
        effect = "ask"
      }
      return effect
    }
    const files = strict("files")
    const shell = strict("software", "system")
    const web = strict("privacy")
    return [
      { action: "read", resource: "*", effect: "allow" },
      { action: "grep", resource: "*", effect: "allow" },
      { action: "glob", resource: "*", effect: "allow" },
      { action: "list", resource: "*", effect: "allow" },
      { action: "write", resource: "*", effect: files },
      { action: "edit", resource: "*", effect: files },
      { action: "patch", resource: "*", effect: files },
      { action: "shell", resource: "*", effect: shell },
      { action: "bash", resource: "*", effect: shell },
      { action: "webfetch", resource: "*", effect: web },
      { action: "websearch", resource: "*", effect: web },
    ]
  }

  const ensureSession = async (text: string) => {
    const current = active()
    if (current) return current
    const title = text.slice(0, 60) || "OpenCode Assist"
    const body = await api("/api/session", {
      method: "POST",
      body: JSON.stringify({
        title,
        ...(directory() ? { location: { directory: directory() } } : {}),
        permissions: permissionsFor(settings()),
      }),
    })
    const id = body?.data?.id
    if (!id) throw new Error("OpenCode did not return a session id")
    setActive(id)
    post({ type: "title", title })
    await postSessions(true)
    return id as string
  }

  const messages = async (id: string) => {
    const body = await api(`/api/session/${encodeURIComponent(id)}/message?limit=100&order=desc`)
    return Array.isArray(body?.data) ? body.data.slice().reverse() : []
  }

  const permissions = async (id: string) => {
    const body = await api(`/api/session/${encodeURIComponent(id)}/permission`)
    return Array.isArray(body?.data) ? body.data : []
  }

  const info = async (id: string) => {
    const body = await api(`/api/session/${encodeURIComponent(id)}`)
    return body?.data as SessionInfo | undefined
  }

  const render = (list: any[]) => {
    for (const message of list) {
      if (message.type !== "assistant") continue
      const text = (message.content || [])
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join("\n")
      const tools = (message.content || [])
        .filter((part: any) => part.type === "tool")
        .map((part: any) => {
          const input = part.state?.input
          const summary = input
            ? String(input.command || input.filePath || input.path || input.query || JSON.stringify(input)).slice(0, 180)
            : ""
          return { id: part.id, name: part.name, status: part.state?.status, input: summary }
        })
      const reasoning = (message.content || [])
        .filter((part: any) => part.type === "reasoning")
        .map((part: any) => part.text)
        .join("\n")
      const error = message.error?.message || ""
      const key = JSON.stringify([text, tools, reasoning, error])
      if (posted.get(message.id) === key) continue
      posted.set(message.id, key)
      if (!text && tools.length === 0 && !error) continue
      post({ type: "assistant", id: message.id, text, tools, reasoning })
      if (error) post({ type: "error", message: error })
    }
  }

  const showPermissions = (list: any[]) => {
    for (const request of list) {
      if (shown.has(request.id)) continue
      shown.add(request.id)
      post({
        type: "permission",
        requestId: request.id,
        sessionID: request.sessionID,
        actions: [
          {
            tool: request.action,
            desc: (request.resources || []).join(", ") || request.message || "The assistant needs permission to continue.",
            consequence: "OpenCode will run this action in your workspace.",
            reversible: true,
            code: request.metadata ? JSON.stringify(request.metadata).slice(0, 2000) : undefined,
          },
        ],
      })
    }
  }

  const usage = (session: SessionInfo | undefined) => {
    if (!session) return
    const tokens = session.tokens || {}
    post({
      type: "usage",
      tokens: (tokens.input || 0) + (tokens.output || 0) + (tokens.reasoning || 0),
      cost: session.cost || 0,
    })
  }

  const stop = () => {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = undefined
    running = false
  }

  const poll = async (id: string) => {
    if (!running) return
    try {
      const [list, requests, session] = await Promise.all([messages(id), permissions(id), info(id)])
      render(list)
      showPermissions(requests)
      usage(session)
      if (list.at(-1)?.type === "idle") {
        stop()
        post({ type: "done" })
        await postSessions(true)
        return
      }
    } catch (error: any) {
      stop()
      post({ type: "error", message: error?.message || String(error) })
      return
    }
    pollTimer = setTimeout(() => void poll(id), 800)
  }

  const prompt = async (text: string) => {
    try {
      post({ type: "typing" })
      const id = await ensureSession(text)
      await api(`/api/session/${encodeURIComponent(id)}/prompt`, {
        method: "POST",
        body: JSON.stringify({ text }),
      })
      running = true
      stop()
      running = true
      await poll(id)
    } catch (error: any) {
      stop()
      post({ type: "error", message: error?.message || String(error) })
    }
  }

  const select = async (id: string) => {
    try {
      stop()
      setActive(id)
      posted = new Map()
      shown = new Set()
      const [list, requests, session] = await Promise.all([messages(id), permissions(id), info(id)])
      const items = list.flatMap((message: any) => {
        if (message.type === "user") return [{ role: "user", text: message.text }]
        if (message.type === "assistant") {
          return [
            {
              role: "assistant",
              id: message.id,
              text: (message.content || [])
                .filter((part: any) => part.type === "text")
                .map((part: any) => part.text)
                .join("\n"),
              tools: (message.content || [])
                .filter((part: any) => part.type === "tool")
                .map((part: any) => ({ name: part.name, status: part.state?.status })),
            },
          ]
        }
        return []
      })
      post({ type: "history", items })
      if (session?.title) post({ type: "title", title: session.title })
      showPermissions(requests)
      usage(session)
      for (const message of list) posted.set(message.id, "history")
      await postSessions(true)
    } catch (error: any) {
      post({ type: "error", message: error?.message || String(error) })
    }
  }

  onMount(() => {
    const refresh = setInterval(() => {
      if (!bridgeReady()) return
      lastSessions = ""
      void postSessions()
    }, 2500)
    const listener = (event: MessageEvent) => {
      if (event.source !== frame?.contentWindow) return
      const data = event.data
      if (!data || data.source !== "assist-bridge") return
      if (data.type === "ready") {
        setBridgeReady(true)
        setStatus("connected agent")
        if (data.settings) setSettings(data.settings as AssistSettings)
        void postSessions(true)
        return
      }
      if (data.type === "settings" && data.settings) {
        setSettings(data.settings as AssistSettings)
        return
      }
      if (data.type === "prompt") {
        if (data.settings) setSettings(data.settings as AssistSettings)
        void prompt(String(data.text || ""))
        return
      }
      if (data.type === "refresh-sessions") {
        lastSessions = ""
        void postSessions(true)
        return
      }
      if (data.type === "new-session") {
        stop()
        setActive(undefined)
        posted = new Map()
        shown = new Set()
        lastSessions = ""
        void postSessions(true)
        return
      }
      if (data.type === "select-session" && data.sessionID) {
        void select(String(data.sessionID))
        return
      }
      if (data.type === "permission-reply") {
        const id = active()
        if (!id) return
        void api(`/api/session/${encodeURIComponent(id)}/permission/${encodeURIComponent(String(data.requestId))}/reply`, {
          method: "POST",
          body: JSON.stringify({ decision: data.approve ? "once" : "reject" }),
        })
          .then(() => post({ type: "permission-resolved", requestId: data.requestId }))
          .catch((error: any) => post({ type: "error", message: error?.message || String(error) }))
      }
    }
    window.addEventListener("message", listener)
    onCleanup(() => {
      clearInterval(refresh)
      window.removeEventListener("message", listener)
      stop()
    })
  })

  return (
    <div data-slot="assist-agent" class="flex h-full min-h-0 w-full flex-col bg-[#0A0F1A]">
      <header class="flex h-10 shrink-0 items-center gap-3 border-b border-[#22304A] bg-[#101828] px-3 text-[12px] text-[#9AA6B8]">
        <a
          href="/"
          class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[#E6EAF2] transition-colors hover:bg-[#1B2740]"
        >
          <Icon name="outline-arrow-left" size="small" />
          Back to OpenCode
        </a>
        <span class="h-4 w-px bg-[#22304A]" aria-hidden="true" />
        <span class="font-medium text-[#E6EAF2]">OpenCode Assist</span>
        <span class="text-[#5F6B80]">{status()}</span>
        <a
          href="/assist-demo.html"
          target="_blank"
          rel="noreferrer"
          class="ms-auto inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[#9AA6B8] transition-colors hover:bg-[#1B2740] hover:text-[#E6EAF2]"
        >
          Open standalone
          <Icon name="arrow-up-right" size="small" />
        </a>
      </header>
      <iframe
        ref={(el) => (frame = el)}
        src={`/assist-demo.html?v=${demoVersion}`}
        title="OpenCode Assist agent"
        class="min-h-0 w-full flex-1 border-0"
        allow="clipboard-read; clipboard-write"
        onLoad={(event) => {
          const iframe = event.currentTarget as HTMLIFrameElement
          const doc = iframe.contentDocument
          const demo = doc?.defaultView as any
          if (!doc || typeof demo?.showView !== "function" || doc.scripts.length === 0) {
            if (demoAttempts++ < 8) {
              setStatus("loading demo…")
              window.setTimeout(() => {
                iframe.src = `/assist-demo.html?v=${Math.random().toString(36).slice(2)}`
              }, 350)
            } else {
              setStatus("demo failed to load")
            }
            return
          }
          demoAttempts = 0
          ensureLocalIcons(event)
          const script = doc.createElement("script")
          script.textContent = `(${assistBridge.toString()})()`
          doc.head.appendChild(script)
          setStatus("connected agent")
        }}
      />
    </div>
  )
}
