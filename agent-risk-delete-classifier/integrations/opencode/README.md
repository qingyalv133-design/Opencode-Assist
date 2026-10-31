# OpenCode Assist integration

This is a **project-local OpenCode plugin**. It does not modify OpenCode core.

## What it does

- Hooks `permission.evaluate`.
- For `shell` / `bash` permissions, calls:

  `agent-risk-delete-classifier/.venv/bin/python -m src.predict`

- If the classifier returns `REQUIRE_APPROVAL` or `REVIEW`, it escalates the existing OpenCode permission prompt to **ask** and adds the classifier reason.
- If the classifier errors or times out, it **fails closed** and asks the user.
- It never executes a command and never auto-approves one.

## Install

Already copied in this workspace to:

```text
opencode/.opencode/plugins/delete-risk.js
```

To reinstall or move it:

```bash
cp agent-risk-delete-classifier/integrations/opencode/delete-risk.js \
   opencode/.opencode/plugins/delete-risk.js
```

Restart the OpenCode/Assist server (or the desktop app) so the plugin is loaded.

**Keep Assist auto-run off.** OpenCode's auto-approver listens to `permission.asked` and can
approve a request even when this plugin changes its effect to `ask`.

Project-local plugin path:

```text
opencode/.opencode/plugins/delete-risk.js
```

For all projects, copy it to:

```text
~/.config/opencode/plugins/delete-risk.js
```

and set `DELETE_RISK_ROOT` if the classifier is not at the default path. In this repository the
default is `../../agent-risk-delete-classifier`; the side-by-side layout falls back to
`../../../agent-risk-delete-classifier`.

## Configuration

| Env | Default | Meaning |
|---|---|---|
| `DELETE_RISK_ROOT` | `agent-risk-delete-classifier` inside this repo, or its sibling | classifier project root |
| `DELETE_RISK_PYTHON` | `$ROOT/.venv/bin/python` | Python interpreter |
| `DELETE_RISK_TIMEOUT_MS` | `2500` | fail-closed timeout |

## Test

In OpenCode/Assist, ask the agent to run a harmless-looking but structurally dangerous shell command, e.g.:

```text
rm -rf /tmp/opencode-risk-demo
```

The existing permission dialog should appear with a message starting with:

```text
[删除风险分类器] REQUIRE_APPROVAL ...
```

Do not use a real path for testing. The classifier only reads text; it does not execute the command.

## Limitations

- Only shell/bash permissions are checked. Other tools are not intercepted.
- The plugin relies on `permission.evaluate`, a v2 OpenCode hook; verify it exists in your installed version.
- The model is synthetic-only and is an additional signal, not a replacement for OpenCode's permission system or human confirmation.
- Starting the Python process for each new command adds latency (typically a few hundred ms). Results are cached per command.
