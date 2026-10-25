# OpenCode Assist

This branch embeds the optimized dark **Assist** workspace into the real OpenCode app.

## What is live

- Opening `/` redirects to `/assist/agent`, so the first screen is the Assist onboarding (step 1 of 6), not the empty OpenCode home.
- Titlebar **Assist** also opens `/assist/agent`.
- The demo's Workspace composer talks to a real OpenCode server session.
- Real assistant replies, `write` / `shell` tools, permission approvals, session list, new session and history are bridged into the original demo UI.
- Real model reasoning is rendered in the demo's thinking box.
- Write/edit/shell actions use the demo's real approval/risk card (sessions are created with an ask policy).
- The demo HTML/CSS/animations are unchanged; the file hash is:

```text
b66d30ebc56bc24d2f4a17f79ee923a60bb790add33febe8b99c0e912d031371
```

`/assist` and `/?assist=1` are the standalone UI-only demo. The public Surge preview is also UI-only because it has no model server.

## Run locally

Requirements: Bun 1.4+, a 2.1.4 OpenCode server with a configured model/provider.

```bash
bun install

# terminal 1 — server
bun run --cwd packages/cli src/index.ts serve --port 4096

# terminal 2 — web app
bun run --cwd packages/app dev
```

Open <http://localhost:3000>, connect the server, then click **Assist** in the titlebar and open **Workspace**.

Desktop:

```bash
bun run --cwd packages/desktop dev
```

## Notes

- The old 1.18.x server is not compatible with this 2.1.4 app; use a 2.1.4 server.
- The public UI preview is at <https://opencode-assist-integrated.surge.sh/>.
- Product/display name is **OpenCode Assist**; the `opencode` command names are unchanged for compatibility.
