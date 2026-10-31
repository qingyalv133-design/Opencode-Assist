/**
 * OpenCode Assist integration for the delete-risk classifier.
 *
 * Install by copying this file to:
 *   opencode-assist/opencode/.opencode/plugins/delete-risk.js
 *
 * It uses OpenCode's permission.evaluate hook. For shell commands it asks the
 * local classifier; REQUIRE_APPROVAL/REVIEW escalates the existing permission
 * prompt to "ask". It never executes the command and never auto-allows it.
 */
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"

// Works in both layouts:
//   repo/agent-risk-delete-classifier + repo/.opencode/plugins (this repository)
//   agent-risk-delete-classifier + opencode/.opencode/plugins (local side-by-side)
const candidates = [
  process.env.DELETE_RISK_ROOT,
  fileURLToPath(new URL("../../agent-risk-delete-classifier/", import.meta.url)),
  fileURLToPath(new URL("../../../agent-risk-delete-classifier/", import.meta.url)),
].filter(Boolean)
const ROOT =
  candidates.find((path) => existsSync(`${path}/artifacts/classifier.joblib`)) || candidates[0]
const PYTHON = process.env.DELETE_RISK_PYTHON || `${ROOT}/.venv/bin/python`
const TIMEOUT_MS = Number(process.env.DELETE_RISK_TIMEOUT_MS || 2500)

function ask(event, message) {
  // Never downgrade an explicit deny.
  if (event.effect === "deny") return
  event.effect = "ask"
  event.message = message
}

function runClassifier(command, cwd) {
  return new Promise((resolve) => {
    const payload = {
      user_request: "OpenCode shell tool permission check",
      tool_name: "shell",
      tool_args: { command },
      execution_mode: "execute",
      working_directory: cwd || "",
    }
    const child = spawn(
      PYTHON,
      ["-m", "src.predict", "--input-json", JSON.stringify(payload)],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          HF_HOME: `${ROOT}/.hf-cache`,
          HF_HUB_OFFLINE: "1",
          TRANSFORMERS_OFFLINE: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    )
    let stdout = ""
    let stderr = ""
    let settled = false
    const finish = (value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      finish({ error: "timeout" })
    }, TIMEOUT_MS)
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    child.on("error", (error) => finish({ error: String(error) }))
    child.on("close", () => {
      if (settled) return
      try {
        finish(JSON.parse(stdout))
      } catch {
        finish({ error: `invalid classifier output: ${(stderr || stdout).slice(0, 300)}` })
      }
    })
  })
}

export default {
  id: "assist-delete-risk",
  setup: async (ctx) => {
    const cache = new Map()
    const directory = ctx.directory || process.cwd()

    await ctx.permission.hook("evaluate", async (event) => {
      if (event.action !== "shell" && event.action !== "bash") return
      if (event.effect === "deny") return
      const resources = Array.isArray(event.resources) ? event.resources : []
      if (resources.length === 0) return
      const command = resources.join("\n")
      const key = command
      let result = cache.get(key)
      if (!result) {
        result = await runClassifier(command, directory)
        cache.set(key, result)
      }
      if (result.error) {
        ask(
          event,
          `[删除风险分类器] 无法完成检查（${result.error}）。按危险处理，必须人工确认。`,
        )
        return
      }
      if (result.decision === "REQUIRE_APPROVAL" || result.decision === "REVIEW") {
        const score = typeof result.score === "number" ? result.score.toFixed(3) : "n/a"
        const reasons = Array.isArray(result.hard_rule_reasons) && result.hard_rule_reasons.length
          ? ` 规则：${result.hard_rule_reasons.join("；")}`
          : ""
        ask(
          event,
          `[删除风险分类器] ${result.decision} · ${result.category} · score=${score}\n` +
            `${result.reason || "需要人工确认"}${reasons}`,
        )
      }
    })
  },
}
