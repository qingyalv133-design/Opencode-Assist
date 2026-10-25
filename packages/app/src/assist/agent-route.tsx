import { createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import { useServers } from "@/runtime/server/registry"

type SessionOption = { id: string; title: string; time_updated: number }

function ensureLocalIcons(event: Event) {
  const doc = (event.currentTarget as HTMLIFrameElement).contentDocument

  if (!doc || doc.getElementById("oc-local-fontawesome")) return

  const link = doc.createElement("link")
  link.id = "oc-local-fontawesome"
  link.rel = "stylesheet"
  link.href = "/assist-assets/fontawesome/css/all.min.css"
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
    activeId = null
    win.permPending = null
    const overlay = document.getElementById("perm-overlay")
    if (overlay) overlay.classList.remove("active")
  }

  function setTitle(title: string) {
    const el = document.getElementById("oc-session-title")
    if (el) el.textContent = title || "New Session"
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

  function assistant(message: any) {
    const c = chat()
    if (!c) return
    let el = c.querySelector('[data-assist-message="' + String(message.id).replace(/"/g, "") + '"]') as HTMLElement | null
    if (!el) {
      el = document.createElement("div")
      el.className = "oc-msg-assistant"
      el.setAttribute("data-assist-message", message.id)
      el.innerHTML =
        '<div class="oc-msg-meta">opencode · just now</div><div class="oc-msg-text"></div><div class="assist-tools"></div>'
      c.appendChild(el)
    }
    if (message.reasoning) setReasoning(String(message.reasoning))
    const text = el.querySelector(".oc-msg-text") as HTMLElement | null
    if (text) text.textContent = message.text || ""
    const tools = el.querySelector(".assist-tools") as HTMLElement | null
    if (tools) {
      tools.innerHTML = ""
      ;(message.tools || []).forEach((tool: any) => {
        const row = win.ocToolBlock(tool.name || "tool", tool.status || "running")
        if (row) tools.appendChild(row)
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
        assistant({ id: item.id, text: item.text, tools: item.tools })
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
    post("prompt", { text })
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
        const stats = document.getElementById("oc-stats")
        if (stats && data.stats) stats.textContent = data.stats.sessions + " sessions · $" + Number(data.stats.cost || 0).toFixed(2)
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
        win.hideOcTyping()
        enable(true)
        break
      case "error": {
        finishThinking()
        win.hideOcTyping()
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

  post("ready")
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

  const postSessions = async () => {
    if (!bridgeReady()) return
    try {
      const list = await sessions()
      const signature = JSON.stringify(list.map((s) => [s.id, s.title, s.time?.updated]))
      if (signature === lastSessions) return
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

  const ensureSession = async (text: string) => {
    const current = active()
    if (current) return current
    const title = text.slice(0, 60) || "OpenCode Assist"
    const body = await api("/api/session", {
      method: "POST",
      body: JSON.stringify({
        title,
        ...(directory() ? { location: { directory: directory() } } : {}),
        permissions: [
          { action: "shell", resource: "*", effect: "ask" },
          { action: "bash", resource: "*", effect: "ask" },
          { action: "write", resource: "*", effect: "ask" },
          { action: "edit", resource: "*", effect: "ask" },
          { action: "patch", resource: "*", effect: "ask" },
        ],
      }),
    })
    const id = body?.data?.id
    if (!id) throw new Error("OpenCode did not return a session id")
    setActive(id)
    post({ type: "title", title })
    await postSessions()
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
        .map((part: any) => ({ name: part.name, status: part.state?.status }))
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
      if (list.some((message: any) => message.type === "idle")) {
        stop()
        post({ type: "done" })
        await postSessions()
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
      await postSessions()
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
        void postSessions()
        return
      }
      if (data.type === "prompt") {
        void prompt(String(data.text || ""))
        return
      }
      if (data.type === "refresh-sessions") {
        lastSessions = ""
        void postSessions()
        return
      }
      if (data.type === "new-session") {
        stop()
        setActive(undefined)
        posted = new Map()
        shown = new Set()
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
