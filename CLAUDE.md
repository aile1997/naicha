# CLAUDE.md

# AI Smart Diet Lens - AI 协作准则 (v3.0)

> **System Alert**: 本文件是 AI 协作的最高准则。Architect、Frontend Builder、Backend Builder 必须严格遵守。

---

## 1. 语言与输出公约 (Language & Output Protocol)

- **核心原则**: 所有回复、说明、文档、注释 **必须使用简体中文**。
- **代码命名**: 严禁使用拼音或拼音缩写。必须使用英文语义化命名。
  - ✅ `getUserInfo`, `totalCalories`, `handleSubmit`
  - ❌ `huoquYonghu`, `kaluli`, `tijiao`
- **例外豁免**: 错误堆栈 (Stack Trace)、系统日志、标准库引用保留英文原样。

---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"奶茶" (naicha) — a React + TypeScript SPA built with Vite. Currently at scaffold stage.

## Commands

- `npm run dev` — start dev server (Vite, proxies `/api` → `localhost:3001`)
- `npm run build` — type-check (`tsc -b`) then bundle (`vite build`)
- `npm run lint` — ESLint
- `npm run preview` — preview production build

## Architecture

- **Vite 7** with `@vitejs/plugin-react`, relative base path (`./`)
- **React 19** with `react-dom/client`, StrictMode enabled
- **TypeScript** strict mode, split configs: `tsconfig.app.json` (src) / `tsconfig.node.json` (vite config)
- **Playwright** available for E2E tests (no test scripts configured yet)
- **react-zoom-pan-pinch** is an installed dependency

## Key Conventions

- Language: zh-CN (HTML lang, page title, font stack prioritizes Source Han Sans / Noto Sans SC)
- CSS: plain CSS in `src/index.css`, no CSS framework yet
- Entry: `src/main.tsx` → `src/App.tsx`
- API proxy: dev server forwards `/api/*` to `http://localhost:3001`
