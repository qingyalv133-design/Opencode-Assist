# Risk Monitor — extracted module

A standalone extraction of the **Risk Monitor** from `demo.html`. It keeps the
six-category risk model, the Auto / Ask / Block policy, the category detail
bento, local decision history, and a simulated permission request.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell and modal markup |
| `risk-monitor.css` | Dark UI, category cards, responsive bento modal |
| `risk-data.js` | The six category definitions extracted from `demo.html` |
| `risk-monitor.js` | Rendering, policy persistence, pending request, modal |

No build step and no external dependencies. Open `index.html` directly, or:

```bash
cd risk-monitor
python3 -m http.server 8099
# http://127.0.0.1:8099/
```

## Interactions

- Click any category card or its **ⓘ** button to open the detail bento.
- Change **Auto / Ask / Block** per category; the policy is saved in
  `localStorage` under `risk-monitor-policy-v1`.
- **Simulate permission request** creates a pending agent action. Approve or
  deny it; the decision is added to recent history.
- **Reset** restores the defaults; **Clear** removes local history.

## Source mapping

The visual system and data come from `demo.html`:

- Risk settings CSS: `demo.html` lines 850–898
- Risk detail modal / bento CSS: lines 899–1310+
- Risk Monitor panel markup: lines 2657–2684
- Risk detail overlay markup: lines 2788–2820
- Category model: lines 4402–4609
- Category cards + policy + history: lines 4728–4924
- Detail modal rendering: lines 4925–5140

The standalone version replaces demo-only helpers (`faBox`, the global
`escapeHtml`, the dock/panel system) with local equivalents while keeping the
category copy and risk semantics intact.
