import { Icon } from "@opencode/ui/icon"

function ensureLocalIcons(event: Event) {
  const doc = (event.currentTarget as HTMLIFrameElement).contentDocument

  if (!doc || doc.getElementById("oc-local-fontawesome")) return

  const link = doc.createElement("link")
  link.id = "oc-local-fontawesome"
  link.rel = "stylesheet"
  link.href = "/assist-assets/fontawesome/css/all.min.css"
  doc.head.appendChild(link)
}

export function AssistRoute() {
  return (
    <div data-slot="assist-demo" class="flex h-dvh min-h-0 w-full flex-col bg-[#0A0F1A]">
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
        <span class="text-[#5F6B80]">embedded demo · exact page</span>
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
        src="/assist-demo.html"
        title="OpenCode Assist demo"
        class="min-h-0 w-full flex-1 border-0"
        allow="clipboard-read; clipboard-write"
        onLoad={ensureLocalIcons}
      />
    </div>
  )
}
