import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { Icon } from "@opencode/ui/icon"
import { useServers } from "@/runtime/server/registry"
import { useServerCtx } from "@/runtime/server/runtime"
import { normalizeMessages, type AssistMessage } from "./conversation"

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
  const local =
    location.hostname === "localhost" || location.hostname === "127.0.0.1" || !/^https?:$/.test(location.protocol)
  link.href = local
    ? "/assist-assets/fontawesome/css/all.min.css"
    : "https://opencode-assist-assets.surge.sh/fontawesome/css/all-embedded.css"
  doc.head.appendChild(link)
}

/**
 * The iframe keeps the demo's visuals. This bridge only translates the native
 * OpenCode view model (messages, reasoning parts, tool parts, permissions and
 * connection state) into DOM updates. It never invents thinking phrases or
 * performs its own timers.
 */
function assistBridge() {
  const win = window as any
  const post = (type: string, payload?: any) => win.parent.postMessage({ source: "assist-bridge", type, ...payload }, "*")
  const chat = () => document.getElementById("oc-chat")
  const input = () => document.getElementById("oc-input") as HTMLTextAreaElement | null
  const send = () => document.getElementById("oc-btn-send") as HTMLButtonElement | null
  const esc = (value: any) => (win.escapeHtml ? win.escapeHtml(String(value ?? "")) : String(value ?? ""))
  let activeId: string | null = null
  let realStats = ""

  try {
    const style = document.createElement("style")
    style.id = "assist-product-style"
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
      .assist-thinking .think-detail p { margin: 0 0 8px; }
      .assist-activity { margin: 8px 0 10px; display: flex; flex-direction: column; gap: 6px; }
      .assist-activity-label { font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: #6F84A2; margin-bottom: 2px; }
      .assist-activity-input { font-family: var(--font-family-mono, monospace); font-size: 11px; color: #9FB4D2; margin: 2px 0 0 14px; white-space: pre-wrap; word-break: break-word; }
      .assist-connection { margin: 6px 0; font-size: 11.5px; color: #F0B35B; }
    `
    document.head.appendChild(style)
  } catch (e) { /* ignore */ }

  function enable(on: boolean) {
    const i = input()
    const s = send()
    if (i) i.disabled = !on
    if (s) s.disabled = !on
  }

  function clearTyping() {
    document.querySelectorAll(".oc-typing").forEach((el) => el.remove())
    try { if (win.hideOcTyping) win.hideOcTyping() } catch (e) { /* ignore */ }
  }

  function clear() {
    const c = chat()
    if (c) c.innerHTML = ""
    activeId = null
    win.permPending = null
    clearTyping()
    const overlay = document.getElementById("perm-overlay")
    if (overlay) overlay.classList.remove("active")
  }

  function setTitle(title: string) {
    const el = document.getElementById("oc-session-title")
    if (el) el.textContent = title || "New Session"
  }

  function setStats(text: string) {
    realStats = text
    const el = document.getElementById("oc-stats")
    if (el && el.textContent !== text) el.textContent = text
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
      if (code) { code.push(raw); continue }
      const line = raw.replace(/\s+$/, "")
      const text = line.trim()
      if (!text) { closeList(); continue }
      const heading = text.match(/^(#{1,4})\s+(.*)$/)
      if (heading) {
        closeList()
        const level = Math.min(4, heading[1].length)
        out.push("<h" + level + ">" + inlineMarkdown(heading[2]) + "</h" + level + ">")
        continue
      }
      if (/^[-*•]\s+/.test(text)) {
        if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul" }
        out.push("<li>" + inlineMarkdown(text.replace(/^[-*•]\s+/, "")) + "</li>")
        continue
      }
      const numbered = text.match(/^\d+[.)]\s+(.*)$/)
      if (numbered) {
        if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol" }
        out.push("<li>" + inlineMarkdown(numbered[1]) + "</li>")
        continue
      }
      if (/^>\s+/.test(text)) {
        closeList()
        out.push("<blockquote>" + inlineMarkdown(text.replace(/^>\s+/, "")) + "</blockquote>")
        continue
      }
      if (/^---+$/.test(text)) { closeList(); out.push("<hr />"); continue }
      closeList()
      out.push("<p>" + inlineMarkdown(line) + "</p>")
    }
    if (code) out.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>")
    closeList()
    return out.join("")
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
    } catch (e) { return null }
  }

  function plainTool(tool: any) {
    const name = String(tool.name || "tool")
    const input = tool.input ? String(tool.input).slice(0, 160) : ""
    if (name === "shell" || name === "bash") return { icon: "fa-terminal", title: "Ran a command", detail: input || "Ran a command." }
    if (name === "write" || name === "edit" || name === "patch") return { icon: "fa-pen-to-square", title: "Changed a file", detail: input || "Changed a file." }
    if (name === "read" || name === "grep" || name === "glob" || name === "list") return { icon: "fa-file-lines", title: "Looked at your files", detail: input || "Read project context." }
    if (name === "webfetch" || name === "websearch") return { icon: "fa-globe", title: "Looked something up", detail: input || "Used the web." }
    return { icon: "fa-circle-check", title: name, detail: input || "Ran " + name + "." }
  }

  function resetTrajectory(text: string) {
    if (!win.ocTrajReset) return
    win.ocTrajReset([
      {
        id: "request",
        icon: "fa-comment-dots",
        title: "Understood your request",
        detail: 'You asked: "' + text.slice(0, 160) + '".',
        status: "done",
        meta: "just now",
      },
    ])
  }

  function sessions(list: any[]) {
    const el = document.getElementById("oc-session-list")
    if (!el) return
    el.innerHTML = (list || [])
      .slice(0, 12)
      .map((s) => {
        const active = s.id === activeId ? " active" : ""
        return (
          '<button type="button" class="oc-session' + active + '" data-assist-session="' + esc(s.id) +
          '"><span class="oc-session-title">' + esc(s.title || "Untitled") +
          '</span><span class="oc-session-time">' + (win.relativeTime ? win.relativeTime(s.time_updated) : "") +
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

  const messageEls = new Map<string, HTMLElement>()
  const reasoningEls = new Map<string, HTMLElement>()
  const activityEls = new Map<string, HTMLElement>()

  function assistantEl(message: AssistMessage) {
    let el = messageEls.get(message.id)
    if (el) return el
    el = document.createElement("div")
    el.className = "oc-msg-assistant"
    el.setAttribute("data-assist-message", message.id)
    el.innerHTML =
      '<div class="oc-msg-meta">opencode · just now</div>' +
      '<div class="assist-thinking"></div>' +
      '<div class="assist-activity"></div>' +
      '<div class="oc-msg-text oc-md"></div>'
    messageEls.set(message.id, el)
    const c = chat()
    if (c) c.appendChild(el)
    return el
  }

  function userEl(message: AssistMessage) {
    let el = messageEls.get(message.id)
    if (el) return el
    el = document.createElement("div")
    el.className = "oc-msg-user"
    el.setAttribute("data-assist-message", message.id)
    messageEls.set(message.id, el)
    const c = chat()
    if (c) c.appendChild(el)
    return el
  }

  function renderReasoning(el: HTMLElement, message: AssistMessage) {
    const host = el.querySelector(".assist-thinking") as HTMLElement | null
    if (!host) return
    if (!message.reasoning.length) {
      host.innerHTML = ""
      return
    }
    let box = host.querySelector(".think-box") as HTMLElement | null
    if (!box) {
      box = document.createElement("div")
      box.className = "think-box"
      box.innerHTML =
        '<div class="think-header"><span class="think-label">Thinking</span>' +
        '<button type="button" class="think-chevron" aria-label="Expand thinking" aria-expanded="false">' +
        '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button></div>' +
        '<div class="think-detail"></div>'
      host.appendChild(box)
      const chevron = box.querySelector(".think-chevron") as HTMLElement
      chevron.onclick = function () { win.toggleThinkDetail(box) }
    }
    const label = box.querySelector(".think-label") as HTMLElement
    label.textContent = message.completed ? "Thought complete" : "Thinking"
    const detail = box.querySelector(".think-detail") as HTMLElement
    for (const part of message.reasoning) {
      let p = reasoningEls.get(part.id) as HTMLElement | undefined
      if (!p || !detail.contains(p)) {
        p = document.createElement("p")
        p.setAttribute("data-reasoning-id", part.id)
        detail.appendChild(p)
        reasoningEls.set(part.id, p)
      }
      p.textContent = part.text
    }
    if (win.ocTrajAdd) {
      win.ocTrajAdd({
        id: "think",
        icon: "fa-brain",
        title: "Thinking it through",
        detail: message.reasoning.map((r) => r.text).join(" ").slice(0, 180),
        status: message.completed ? "done" : "active",
        meta: message.completed ? "thought" : "working",
      })
    }
  }

  function renderActivities(el: HTMLElement, message: AssistMessage) {
    const host = el.querySelector(".assist-activity") as HTMLElement | null
    if (!host) return
    if (!message.activities.length) {
      host.innerHTML = ""
      return
    }
    if (!host.querySelector(".assist-activity-label")) {
      const label = document.createElement("div")
      label.className = "assist-activity-label"
      label.textContent = "Activity"
      host.appendChild(label)
    }
    for (const activity of message.activities) {
      let row = activityEls.get(activity.id) as HTMLElement | undefined
      if (!row || !host.contains(row)) {
        row = document.createElement("div")
        row.className = "assist-activity-row"
        row.setAttribute("data-activity-id", activity.id)
        const block = win.ocToolBlock(activity.name, activity.status)
        if (block) row.appendChild(block)
        if (activity.input) {
          const detail = document.createElement("div")
          detail.className = "assist-activity-input"
          detail.textContent = activity.input
          row.appendChild(detail)
        }
        host.appendChild(row)
        activityEls.set(activity.id, row)
      }
      const status = row.querySelector(".oc-tool-status")
      if (status) status.textContent = activity.status
      const plain = plainTool(activity)
      if (win.ocTrajAdd) {
        win.ocTrajAdd({
          id: "tool-" + activity.id,
          icon: plain.icon,
          title: plain.title,
          detail: plain.detail,
          status: activity.status === "completed" ? "done" : activity.status === "error" ? "denied" : "active",
          meta: activity.status,
        })
      }
    }
  }

  function renderTimeline(messages: AssistMessage[], status: string, connection: string, reset: boolean) {
    const c = chat()
    if (!c) return
    if (reset) {
      clear()
      messageEls.clear()
      reasoningEls.clear()
      activityEls.clear()
    }
    for (const message of messages) {
      const el = message.role === "user" ? userEl(message) : assistantEl(message)
      if (message.role === "user") {
        if (el.textContent !== message.text) el.textContent = message.text
      } else {
        renderReasoning(el, message)
        renderActivities(el, message)
        const text = el.querySelector(".oc-msg-text") as HTMLElement | null
        if (text) {
          const html = renderMarkdown(message.text)
          if (text.innerHTML !== html) text.innerHTML = html
        }
        if (message.reasoning.length || message.activities.length || message.text) clearTyping()
        if (message.error) {
          const err = document.createElement("div")
          err.className = "oc-msg-system"
          err.textContent = message.error
          el.appendChild(err)
        }
      }
    }
    const visible = messages.some((m) => m.role === "assistant" && (m.text || m.reasoning.length || m.activities.length))
    if (status === "running" && !visible) win.showOcTyping()
    if (status !== "running") clearTyping()
    const existingConn = c.querySelector(".assist-connection") as HTMLElement | null
    if (connection !== "connected") {
      if (!existingConn) {
        const line = document.createElement("div")
        line.className = "assist-connection"
        line.textContent = "Connection interrupted — reconnecting…"
        c.appendChild(line)
      }
    } else if (existingConn) {
      existingConn.remove()
    }
    c.scrollTop = c.scrollHeight
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
    if (event) { event.preventDefault(); event.stopPropagation() }
    clear()
    setTitle("New Session")
    post("new-session")
  }

  win.ocSelectSession = function (button: any) {
    if (!button) return
    const id = button.getAttribute("data-assist-session")
    if (id) { activeId = id; post("select-session", { sessionID: id }) }
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
      case "sessions":
        sessions(data.sessions || [])
        if (data.stats) setStats(data.stats.sessions + " sessions · $" + Number(data.stats.cost || 0).toFixed(2))
        break
      case "timeline":
        renderTimeline(data.messages || [], data.status || "idle", data.connection || "connected", !!data.reset)
        break
      case "permission":
        win.showPermDialog({ requestId: data.requestId, sessionId: data.sessionID, actions: data.actions || [] })
        break
      case "permission-resolved": {
        const overlay = document.getElementById("perm-overlay")
        if (overlay) overlay.classList.remove("active")
        win.permPending = null
        break
      }
      case "usage":
        if (win.ocUsage) {
          const total = Number(data.tokens || 0)
          win.ocUsage.tokens = total
          win.ocUsage.contextPct = Math.min(99, +(total / Math.max(1, win.ocUsage.contextWindow) * 100).toFixed(1))
          if (win.renderOcUsage) win.renderOcUsage()
        }
        break
      case "error": {
        clearTyping()
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
    }
  })

  setInterval(function () {
    if (!realStats) return
    const el = document.getElementById("oc-stats")
    if (el && el.textContent !== realStats) el.textContent = realStats
  }, 800)

  const version = win.document.querySelector(".oc-version")
  if (version) version.textContent = "Assist"
  try { win.FAKE_SESSIONS = [] } catch (e) { /* ignore */ }

  post("ready", { settings: currentSettings() })
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
  const ctx = useServerCtx(server)
  const [active, setActive] = createSignal<string>()
  const [bridgeReady, setBridgeReady] = createSignal(false)
  const [settings, setSettings] = createSignal<AssistSettings>()
  const [status, setStatus] = createSignal("connecting…")
  let frame: HTMLIFrameElement | undefined
  let demoAttempts = 0
  let lastTimeline = ""
  let resetNext = false
  let shownPermissions = new Set<string>()
  let lastSessions = ""

  const post = (message: any) => {
    if (!frame?.contentWindow) return
    frame.contentWindow.postMessage({ source: "assist-parent", ...message }, location.origin)
  }

  const permissionsFor = (
    input: AssistSettings | undefined,
  ): Array<{ action: string; resource: string; effect: "allow" | "ask" | "deny" }> => {
    const categories = input?.policy?.categories || {}
    const strict = (...names: string[]): "allow" | "ask" | "deny" => {
      let effect: "allow" | "ask" | "deny" = "ask"
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

  const messages = createMemo<AssistMessage[]>(() => {
    const c = ctx()
    const id = active()
    if (!c || !id) return []
    return normalizeMessages(c.data.session.message.list(id))
  })

  const postSessions = (force = false) => {
    const c = ctx()
    if (!c || !bridgeReady()) return
    const list = c.data.session.list()
    const payload = list.map((session) => ({
      id: session.id,
      title: session.title || "Untitled",
      time_updated: session.time.updated,
    }))
    const signature = JSON.stringify(payload)
    if (!force && signature === lastSessions) return
    lastSessions = signature
    post({
      type: "sessions",
      sessions: payload,
      stats: { sessions: list.length, cost: list.reduce((total, session) => total + (session.cost || 0), 0) },
    })
  }

  const ensureSession = async (text: string) => {
    const c = ctx()
    if (!c) throw new Error("OpenCode server is not connected")
    const current = active()
    if (current) return current
    const location = c.data.location.default()
    const info = await c.sdk.api.session.create({
      title: text.slice(0, 60) || "OpenCode Assist",
      location,
      permissions: permissionsFor(settings()),
    })
    c.data.session.remember(info)
    setActive(info.id)
    await Promise.all([c.data.session.message.sync(info.id), c.data.session.permission.sync(info.id)])
    postSessions(true)
    return info.id
  }

  const prompt = async (text: string) => {
    const c = ctx()
    if (!c) {
      post({ type: "error", message: "OpenCode server is not connected." })
      return
    }
    try {
      post({ type: "timeline", messages: messages(), status: "running", connection: c.sdk.connection.status(), reset: true })
      const id = await ensureSession(text)
      await c.data.session.prompt({ sessionID: id, text })
      await c.data.session.message.sync(id)
      postSessions(true)
    } catch (error: any) {
      post({ type: "error", message: error?.message || String(error) })
    }
  }

  const select = async (id: string) => {
    const c = ctx()
    if (!c) return
    resetNext = true
    lastTimeline = ""
    setActive(id)
    shownPermissions = new Set()
    try {
      await Promise.all([c.data.session.message.sync(id), c.data.session.permission.sync(id)])
      postSessions(true)
    } catch (error: any) {
      post({ type: "error", message: error?.message || String(error) })
    }
  }

  onMount(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== frame?.contentWindow) return
      const data = event.data
      if (!data || data.source !== "assist-bridge") return
      if (data.type === "ready") {
        setBridgeReady(true)
        setStatus("connected agent")
        if (data.settings) setSettings(data.settings as AssistSettings)
        postSessions(true)
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
      if (data.type === "new-session") {
        setActive(undefined)
        resetNext = true
        lastTimeline = ""
        shownPermissions = new Set()
        post({ type: "timeline", messages: [], status: "idle", connection: "connected", reset: true })
        postSessions(true)
        return
      }
      if (data.type === "select-session" && data.sessionID) {
        void select(String(data.sessionID))
        return
      }
      if (data.type === "permission-reply") {
        const c = ctx()
        const id = active()
        if (!c || !id) return
        void c.data.session.permission
          .reply({ sessionID: id, requestID: String(data.requestId), decision: data.approve ? "once" : "reject" })
          .then(() => post({ type: "permission-resolved", requestId: data.requestId }))
          .catch((error: any) => post({ type: "error", message: error?.message || String(error) }))
      }
    }
    window.addEventListener("message", listener)
    onCleanup(() => window.removeEventListener("message", listener))
  })

  createEffect(() => {
    const c = ctx()
    if (!c || !bridgeReady()) return
    const id = active()
    const list = messages()
    const state = id ? c.data.session.status(id) : "idle"
    const connection = c.sdk.connection.status()
    const payload = { type: "timeline", messages: list, status: state, connection, reset: resetNext }
    const signature = JSON.stringify(payload)
    if (signature === lastTimeline) return
    lastTimeline = signature
    resetNext = false
    post(payload)
    if (state === "idle") postSessions(true)
  })

  createEffect(() => {
    const c = ctx()
    if (!c || !bridgeReady()) return
    const id = active()
    if (!id) return
    const requests = c.data.session.permission.list(id) || []
    for (const request of requests) {
      if (shownPermissions.has(request.id)) continue
      shownPermissions.add(request.id)
      post({
        type: "permission",
        requestId: request.id,
        sessionID: id,
        actions: [
          {
            tool: request.action,
            desc: [(request.resources || []).join(", "), request.message].filter(Boolean).join(" · ") || "The assistant needs permission to continue.",
            consequence: "OpenCode will run this action in your workspace.",
            reversible: true,
            code: request.metadata ? JSON.stringify(request.metadata).slice(0, 2000) : undefined,
          },
        ],
      })
    }
  })

  createEffect(() => {
    const c = ctx()
    if (!c || !bridgeReady()) return
    const id = active()
    if (!id) return
    const info = c.data.session.get(id)
    if (!info) return
    const tokens = info.tokens
    post({
      type: "usage",
      tokens: (tokens?.input || 0) + (tokens?.output || 0) + (tokens?.reasoning || 0),
      cost: info.cost || 0,
    })
  })

  // Reconciliation fallback for transports that cannot keep the native SSE stream open
  // (for example a buffering reverse proxy). Native events remain the primary path.
  createEffect(() => {
    const c = ctx()
    const id = active()
    const connection = c?.sdk.connection.status()
    if (!c || !id || connection === "connected") return
    const timer = setInterval(() => {
      void c.data.session.message.sync(id)
      void c.data.session.permission.sync(id)
    }, 1500)
    onCleanup(() => clearInterval(timer))
  })

  return (
    <div data-slot="assist-agent" class="flex h-full min-h-0 w-full flex-col bg-[#0A0F1A]">
      <header class="flex h-10 shrink-0 items-center gap-3 border-b border-[#22304A] bg-[#101828] px-3 text-[12px] text-[#9AA6B8]">
        <a href="/new-session" class="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[#E6EAF2] transition-colors hover:bg-[#1B2740]">
          <Icon name="outline-arrow-left" size="small" />
          Back to OpenCode
        </a>
        <span class="h-4 w-px bg-[#22304A]" aria-hidden="true" />
        <span class="font-medium text-[#E6EAF2]">OpenCode Assist</span>
        <span class="text-[#5F6B80]">{status()}</span>
        <a href="/assist-demo.html" target="_blank" rel="noreferrer" class="ms-auto inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[#9AA6B8] transition-colors hover:bg-[#1B2740] hover:text-[#E6EAF2]">
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
              window.setTimeout(() => { iframe.src = `/assist-demo.html?v=${Math.random().toString(36).slice(2)}` }, 350)
            } else setStatus("demo failed to load")
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
