# Cadence (Desktop)

Cadence is a desktop planner built for students who need one place to manage both school and personal life. It is built with Tauri 2, React, and TypeScript.

---

## What it does

- **Two workspaces**: Keep School and Life separate.
- **School tools**: Courses, task types (assignments, quizzes, labs, exams), grade tracking, weighted calculations, drop-lowest rules, and final-grade planning.
- **Life tools**: Categories and recurring tasks.
- **Home dashboard**: Snapshot widgets, weather, focus tasks, mini calendar, recurring tasks, and quick views for today, overdue, and next 7 days.
- **Command Center (`Ctrl+K`)**: Quick add, grade queries, and optional voice input.
- **Import Outline**: Upload a PDF/image or paste text to extract tasks and course details (rule-based or AI-assisted).
- **Views**: Today, Upcoming, School, Life, and full Calendar.
- **Speech-to-text** and voice detection: Allows users to add tasks, queries, and commands using voice input.
- Grade-related calculations use [rapidtables](https://www.rapidtables.com)-style format.

---

## AI features

- **Natural-language quick add**  
  Example: `add comp2401 assignment weight 8%`
- **Syllabus extraction**  
  Use AI in Import Outline to pull assignments, dates, and weights from messy syllabi.
- **Effort suggestion**  
  Suggests estimated effort (minutes) in the School task modal.

To enable AI features, set `VITE_OPENAI_API_KEY` in `.env`. Do not commit `.env`.

---

## Tech stack

### Desktop and build

- **[Tauri 2](https://tauri.app/)** — Rust-backed desktop shell and native APIs  
- **[Vite 5](https://vitejs.dev/)** + **TypeScript** — dev server and production bundle  

### UI

- **[React 18](https://react.dev/)**  
- **[Tailwind CSS](https://tailwindcss.com/)**  

### Data and state

- **SQLite** — local-first storage (`@tauri-apps/plugin-sql`)  
- **[TanStack Query](https://tanstack.com/query)** — async and cached data  

### Forms and validation

- **[React Hook Form](https://react-hook-form.com/)** + **[Zod](https://zod.dev/)** (`@hookform/resolvers`)  

### Routing

- **[React Router](https://reactrouter.com/)** v6  

### Import outline and files

- **`@tauri-apps/plugin-fs`** — file access from the desktop shell  
- **[PDF.js](https://mozilla.github.io/pdf.js/)** — PDF text in the browser  
- **[Tesseract.js](https://tesseract.projectnaptha.com/)** — OCR for images  

### Dates

- **[date-fns](https://date-fns.org/)**  

---

## Run locally

Requirements: Node.js 18+ and Rust

```bash
npm install
npm run tauri:dev
```

Build production app:

```bash
npm run tauri:build
```

If you update `app-icon.png`, regenerate icons with:

```bash
npx tauri icon app-icon.png
```

Then keep `public/app-icon.png` in sync.

---

## Credits

[rapidtables](https://www.rapidtables.com) was used as a reference for grade-related logic.
