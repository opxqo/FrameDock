# Third-party notices

## infinite-canvas

`apps/web` is derived from [basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas), commit `3a6b64b602ad062b29fac66902ed18a7ef5fd9dc` (`3a6b64b`, v0.20.0).

`apps/server/src/proxy.ts` is adapted from `canvas-proxy/index.js` in the same repository and commit.

The original MIT license is reproduced in full below and preserved in `apps/web/LICENSE`.

```text
MIT License

Copyright (c) 2026 basketikun

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## LobeHub Icons

`apps/web/public/icons/lobehub/*.svg` are copied from [`@lobehub/icons-static-svg`](https://www.npmjs.com/package/@lobehub/icons-static-svg) v1.95.1 ([lobehub/lobe-icons](https://github.com/lobehub/lobe-icons)), MIT License, Copyright (c) LobeHub. The logos themselves are trademarks of their respective owners and are used only to identify the corresponding models.

---

## Agent skills（`.claude/skills/`）

供 Claude Code 等编码 Agent 使用的设计 skill，原样复制，未修改，各目录内附原许可证。

- `.claude/skills/impeccable/`：复制自 [pbakaus/impeccable](https://github.com/pbakaus/impeccable)（提交 `08d5b47`）的 `.claude/skills/impeccable`，Apache License 2.0，作者 Paul Bakaus。见该目录下的 `LICENSE` 与 `NOTICE.md`。
- `.claude/skills/design-taste-frontend/`：复制自 [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)（提交 `f624f37`）的 `skills/taste-skill`，MIT License，Copyright (c) 2026 Leonxlnx。
- `.claude/skills/redesign-existing-projects/`：复制自同一仓库的 `skills/redesign-skill`，MIT License，Copyright (c) 2026 Leonxlnx。


---

## Geist 字体

`apps/web` 通过 npm 依赖 [`@fontsource-variable/geist`](https://www.npmjs.com/package/@fontsource-variable/geist) 和 [`@fontsource-variable/geist-mono`](https://www.npmjs.com/package/@fontsource-variable/geist-mono) 自托管 [Geist](https://github.com/vercel/geist-font) 字体，SIL Open Font License 1.1，Copyright 2024 The Geist Project Authors。

## cmdk

`apps/web` 的命令面板依赖 [`cmdk`](https://github.com/pacocoursey/cmdk)，MIT License，Copyright (c) 2022 Paco Coursey。
