---
version: 1
slug: "src-pages-canvas-project-tsx"
primary_target: "src/pages/canvas/project.tsx"
related_targets: ["src/pages/home/index.tsx","src/pages/config/index.tsx"]
---

# Surface brief: FrameDock app (canvas editor + shell)

Scope: whole web app — canvas editor (primary), home/project list, settings, image/video workbenches, assets. Mode: Operate.
Task: build and run node workflows (text → image → video), watch long-running generations, compare results, control cost. High frequency, long sessions, desktop.
Constraints: antd 6 + Tailwind v4 kept; all features preserved; secondary features moved under "高级"; zh-CN primary, en-US must work. User pinned: dark, charcoal ground, one accent.

## Direction contract

FORM: seed:9a0f4dd05237502a (degraded roll, no challengers) — candidate 5 of 7: broadcast control room tally.
THESIS: The canvas is a vision mixer for generations: every node wears a tally lamp, and a running chain lights up along its wires like a programme going to air. Refuses the grey-screen-plus-one-accent default and the purple AI-gradient.
OWN-WORLD: cool control-room charcoal grounds in 3 steps; one signal-amber accent for primary action, selection, focus; tally state colours (idle grey, queued/running amber, done green, failed red, stale dashed) used only for state; hairline 1px borders, tight 8px radii; Geist Sans UI with Geist Mono tabular for durations, prices, sizes, counts.
STORY: open a project, see at a glance which nodes are done, failed or stale; run a chain and watch the path light node by node while the top programme bar shows progress, current node and cost.
FIRST VIEWPORT: canvas fills the screen; slim top programme bar (back, name, save state, run progress/stop); left tool rail; media is the brightest thing on screen.
SIGNATURE: tally lamps on nodes + lit wire path during chain runs + programme bar.
RISK: too many state colours — idle screens must stay quiet; tally colours never decorate.
