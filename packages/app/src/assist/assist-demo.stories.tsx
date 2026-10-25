function ensureLocalIcons(event: Event) {
  const doc = (event.currentTarget as HTMLIFrameElement).contentDocument

  if (!doc || doc.getElementById("oc-local-fontawesome")) return

  const link = doc.createElement("link")
  link.id = "oc-local-fontawesome"
  link.rel = "stylesheet"
  link.href = "/assist-assets/fontawesome/css/all.min.css"
  doc.head.appendChild(link)
}

export default {
  title: "OpenCode/Assist/Optimized UI",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The exact OpenCode Assist dark demo, served unchanged from packages/app/public/assist-demo.html. The Text prototype story is a plain-language review surface for the same flows.",
      },
    },
  },
}

export const EmbeddedDemo = {
  name: "Embedded demo (exact page)",
  render: () => (
    <div class="flex h-dvh w-screen min-h-0 flex-col bg-[#0A0F1A]">
      <iframe
        src="/assist-demo.html"
        title="OpenCode Assist demo"
        class="min-h-0 w-full flex-1 border-0"
        onLoad={ensureLocalIcons}
      />
    </div>
  ),
}

export const TextPrototype = {
  name: "Text prototype",
  render: () => (
    <div class="h-dvh w-screen overflow-auto bg-[#0A0F1A] px-8 py-7 font-mono text-[12px] leading-6 text-[#C8D2E4]">
      <div class="mx-auto max-w-[920px]">
        <div class="text-[#5F6B80]">OPENCODE ASSIST · OPTIMIZED UI · TEXT PROTOTYPE (REVIEW BEFORE PORT)</div>
        <h1 class="mt-2 text-[22px] font-semibold text-[#E6EAF2]">What changes in the real app</h1>
        <p class="mt-2 max-w-[760px] text-[#9AA6B8]">
          This is the plain-text version of the dark demo. It is intentionally unstyled so the information architecture
          and interaction decisions are the only thing under review. The approved direction is to keep the demo page
          intact and embed it in opencode first, then port the same patterns into the native components.
        </p>

        <hr class="my-6 border-[#22304A]" />

        <h2 class="text-[15px] font-semibold text-[#E6EAF2]">01 · Composer + token usage</h2>
        <pre class="mt-2 whitespace-pre-wrap text-[#9AA6B8]">{`┌──────────────────────────────────────────────────────────────┐
│ Ask OpenCode anything…                                       │
│  [+] [Build v]                    Enter to send · Shift+Enter │
│                                                    [↑]        │
└──────────────────────────────────────────────────────────────┘
  Trajectory · 2 steps · LIVE
  ↻ 2 rounds · 38 steps · 226 tok/s   ▤ 1.3M tok · cache hit 98%   ◔ 6%

  Hover: each item gets a low-contrast surface.
  Click: one small popover above the composer.
    Rounds  → rounds, tool steps, avg speed
    Tokens  → total, cache hit, input, output, cache meter
    Context → used, remaining, window, context meter
  Values advance when a message is sent or a permission is approved.`}</pre>

        <h2 class="mt-7 text-[15px] font-semibold text-[#E6EAF2]">02 · Trajectory page (above the composer)</h2>
        <pre class="mt-2 whitespace-pre-wrap text-[#9AA6B8]">{`┌─ SESSION TRAJECTORY · PLAIN LANGUAGE ─────────────────────────────┐
│ Every step OpenCode took — without the jargon          [9 steps] [x]│
│                                                                    │
│ ✓ Workspace opened                                      DONE       │
│   Your project is open in a safe workspace…                         │
│ ✓ Understood your request                              DONE       │
│   You asked for a small pixel-art game demo…                        │
│ ✓ Planned five safe steps                               DONE       │
│   I split the build into five small steps…                          │
│ ✓ Added a small game helper                             DONE       │
│   I added a helper package called @pixelgame/engine…                │
│ ✓ Saved the pixel-art images                            DONE       │
│   I downloaded 48 small pictures…                                   │
│ ✓ Updated the game code                                 DONE       │
│   I added a player, keyboard controls, a score…                     │
│ ✓ Connected to the remote game engine                   DONE       │
│   I opened a secure connection…                                     │
│ ✓ Built and packaged the game                           DONE       │
│   I put the approved pieces together…                               │
│                                                                     │
│ ┌──────────┬──────────┬──────────┬──────────┐                      │
│ │ STEPS 9  │APPROVED 5│ ROUNDS 3 │ TOKENS1.3M│                      │
│ └──────────┴──────────┴──────────┴──────────┘                      │
└────────────────────────────────────────────────────────────────────┘

  Behaviour: opens in-flow above the composer, scrolls the chat to the
  latest approval card, keeps the header and summary sticky. Every step
  is written for a non-technical reader; no shell commands are shown.`}</pre>

        <h2 class="mt-7 text-[15px] font-semibold text-[#E6EAF2]">03 · Approval card + code details</h2>
        <pre class="mt-2 whitespace-pre-wrap text-[#9AA6B8]">{`┌─ Permission required ────────────────────────────── [x] ─┐
│ Software & Settings · Install the game engine helper       │
│ Adds a small helper package                                │
│ < /> View actual code                                       │
│                                                            │
│ [x] Don't ask again for this type        [Deny] [Approve]  │
└────────────────────────────────────────────────────────────┘

  View actual code opens a read-only diff modal:
  ┌─ ACTUAL CODE · READ-ONLY PREVIEW ──────────────────────┐
  │ package.json                              JSON   +1 −0 │
  │ @@ -18,6 +18,7 @@                                      │
  │   "dependencies": {                                    │
  │ +   "@pixelgame/engine": "^1.4.0"                      │
  │   }                                                    │
  └────────────────────────────────────────────────────────┘`}</pre>

        <h2 class="mt-7 text-[15px] font-semibold text-[#E6EAF2]">04 · Risk Monitor detail (Bento)</h2>
        <pre class="mt-2 whitespace-pre-wrap text-[#9AA6B8]">{`┌─ Privacy & Info ────────────────────────────── High risk ─┐
│ ┌──────────────────────┐ ┌────────────────────────────────┐ │
│ │ RISK BY OPERATION    │ │ [news photo fills the tile]    │ │
│ │ HIGH/MED/LOW bars    │ │ IN THE NEWS                    │ │
│ │ 5 ops                │ │ UnitedHealth breach exposed…   │ │
│ └──────────────────────┘ └────────────────────────────────┘ │
│ ┌──────────────────────┐ ┌────────────────────────────────┐ │
│ │ KEY FACTS            │ │ RISK FACTORS                   │ │
│ │ large type + icons   │ │ icon + level + mini bar        │ │
│ └──────────────────────┘ └────────────────────────────────┘ │
│ ┌──────────────────────┐ ┌────────────────────────────────┐ │
│ │ RECENT ACTIVITY      │ │ NOTES                          │ │
│ └──────────────────────┘ └────────────────────────────────┘ │
│ Data sources (11) [v]              [Auto] [Ask me] [Block]   │
└──────────────────────────────────────────────────────────────┘`}</pre>

        <h2 class="mt-7 text-[15px] font-semibold text-[#E6EAF2]">05 · Onboarding</h2>
        <pre class="mt-2 whitespace-pre-wrap text-[#9AA6B8]">{`Step 5 · capability cards
  [Observer] [Workspace REC] [Connected] [Privileged]
  - REC is a small corner pill, not a wide overlapping badge
  - Privileged has no red border; selection uses the normal blue ring
  - Auto-run checkboxes use a transparent low-saturation accent fill

All onboarding cards, auto-run rows and the plugin summary get a
300px mouse-tracking spotlight: one overlay per element, CSS variables,
rAF throttling, 260ms expo-out fade, rounded clipping, disabled on
touch and prefers-reduced-motion.`}</pre>

        <hr class="my-6 border-[#22304A]" />
        <div class="text-[#5F6B80]">
          Review questions: (1) embed the exact page first, then port patterns? (2) approve the vertical slice order?
          (3) should the native entry be a titlebar “Assist” button, a command, or both? The current recommendation is
          both, with the embedded page as the source of truth.
        </div>
      </div>
    </div>
  ),
}
