# Cadence

**Cross-platform AI desktop planner for students — built with Tauri, Rust, and local-first SQLite.**

Cadence unifies academic and personal life management in one desktop app. It tracks grades, extracts assignments from syllabi, and uses AI to surface what you should be focusing on — based on your actual performance, not just deadlines.

---

## What makes it different

Most student planners are glorified to-do lists. Cadence tracks weighted grades, calculates what score you need on remaining assessments to hit your target, and uses that data to generate smart suggestions — surfacing academic gaps, flagging at-risk courses, and recommending where to focus your time.

Everything runs locally. No cloud sync, no accounts, no latency. SQLite stores all data on device via Tauri's native file system APIs.

---

## Key Features

**Academic planning**
- Grade tracking with weighted calculations and drop-lowest rules
- Final grade planning — calculates required scores on remaining assessments
- Course management across assignments, quizzes, labs, and exams

**AI features**
- Syllabus extraction — upload a PDF or image, Tesseract.js OCR pulls out assignments, dates, and weights automatically
- Smart suggestions — AI analyzes your grade trends and surfaces specific academic gaps and focus recommendations
- Natural-language task creation — add tasks by describing them in plain English
- Voice input — add tasks and queries hands-free

**Life management**
- Separate School and Life workspaces
- Recurring tasks and personal categories
- Home dashboard with weather, focus tasks, mini calendar, and overdue views

**Command Center (`Ctrl+K`)**
Quick add, grade queries, and voice input from anywhere in the app.

---

## Stack

| Layer | Tech |
|---|---|
| **Desktop shell** | Tauri 2, Rust |
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite |
| **Data** | SQLite (local-first via @tauri-apps/plugin-sql) |
| **State** | TanStack Query |
| **Forms** | React Hook Form, Zod |
| **OCR** | Tesseract.js |
| **AI** | LLM APIs |
| **Dates** | date-fns |

---

## Running

**Requirements:** Node.js 18+, Rust

Install dependencies and start in dev mode:

```
npm install
npm run tauri:dev
```

To enable AI features, add your LLM API key to `.env` as `VITE_OPENAI_API_KEY`. Do not commit `.env`.
