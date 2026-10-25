export type AssistReasoning = {
  id: string
  text: string
}

export type AssistActivity = {
  id: string
  name: string
  status: string
  input?: string
  error?: string
}

export type AssistMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  reasoning: AssistReasoning[]
  activities: AssistActivity[]
  completed: boolean
  error?: string
}

/**
 * Normalizes the native OpenCode message/part stream into the small view model the Assist UI renders.
 * Every item keeps its real message/part id so reasoning, activities and permissions can be matched
 * across incremental updates, session switches and reconnects.
 */
export function normalizeMessages(messages: readonly any[]): AssistMessage[] {
  const out: AssistMessage[] = []
  for (const message of messages) {
    if (message.type === "user") {
      out.push({
        id: message.id,
        role: "user",
        text: message.text || "",
        reasoning: [],
        activities: [],
        completed: true,
      })
      continue
    }
    if (message.type !== "assistant") continue

    const reasoning: AssistReasoning[] = []
    const activities: AssistActivity[] = []
    let text = ""
    const content = Array.isArray(message.content) ? message.content : []
    content.forEach((part: any, index: number) => {
      if (part.type === "text") {
        text += (text ? "\n" : "") + (part.text || "")
        return
      }
      if (part.type === "reasoning") {
        reasoning.push({ id: part.id || `${message.id}:reasoning:${index}`, text: part.text || "" })
        return
      }
      if (part.type === "tool") {
        const input = part.state?.input
        const summary = input
          ? String(input.command || input.filePath || input.path || input.query || JSON.stringify(input)).slice(0, 180)
          : ""
        activities.push({
          id: part.id || `${message.id}:tool:${index}`,
          name: part.name || "tool",
          status: part.state?.status || "running",
          input: summary,
          error: part.state?.error?.message,
        })
      }
    })

    out.push({
      id: message.id,
      role: "assistant",
      text,
      reasoning,
      activities,
      completed: !!message.time?.completed || !!message.finish,
      error: message.error?.message,
    })
  }
  return out
}
