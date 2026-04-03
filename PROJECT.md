# Study Companion — Project Reference

## 1. Project Identity

**Name:** Study Companion
**Type:** AI-powered study productivity SaaS (full-stack web application)

**Goal:**
Build a production-level web application that helps students plan, track, and optimize their learning using structured workflows and AI assistance.

---

## 2. Tech Stack (LOCKED)

**Frontend:**

* Next.js (App Router, TypeScript)
* Tailwind CSS
* ShadCN UI
* Framer Motion

**Backend:**

* FastAPI (Python)

**Database:**

* PostgreSQL

---

## 3. Core Features

### 1. Dashboard

* Weekly focus hours
* Current streak
* Cards mastered
* Active courses with progress
* Today’s plan timeline

### 2. Study Planner

* Study campaigns (e.g., Finals Prep Sprint)
* Days left, topics remaining, focus score
* Active study sessions
* Resume session functionality

### 3. Assignments & Labs

* Overview stats (total, in-progress, completed, upcoming)
* Assignment table (course, due date, status)
* CRUD operations (add/update/delete)

### 4. AI Chat

* Chat interface (ChatGPT-style)
* User vs AI messages
* Typing indicator
* File preview UI (PDF/image placeholder)
* Input bar with actions

---

## 4. UI / Design System Rules

**Theme:**

* Dark (Indigo Slate)

**Core Colors:**

* Background: #0f1117
* Surface: #1a1d2e
* Primary: #6366f1
* Text Primary: #e2e8f0
* Text Secondary: #94a3b8

**Design Principles:**

* Soft shadows (neomorphic feel)
* Rounded cards (not pill-shaped)
* Subtle glow effects
* Clean spacing and layout hierarchy
* Minimal, smooth animations
* High readability and contrast

**Style Reference:**

* Premium macOS-inspired SaaS UI

---

## 5. Architecture Overview

### Frontend Structure

* App Router-based routing:

  * `/dashboard`
  * `/planner`
  * `/assignments`
  * `/chat`

* Component structure:

  * `components/ui/` → base UI elements
  * `components/shared/` → layout (Sidebar, Header)
  * `components/features/` → feature-specific components

* Additional layers:

  * `lib/api/` → API calls
  * `lib/utils/` → helpers
  * `lib/hooks/` → custom hooks
  * `types/` → TypeScript types

---

### Backend Structure

```
backend/
  app/
    main.py
    core/
    db/
    models/
    schemas/
    services/
    api/
      v1/
        routers/
```

---

## 6. API Design Rules

* Base path: `/api/v1/...`
* RESTful architecture
* JSON request/response format
* Separation of concerns:

  * routers → endpoints
  * services → business logic
  * schemas → validation

---

## 7. Database Entities (High-Level)

* users
* courses
* study_sessions
* assignments
* chat_messages

PostgreSQL is the primary database from the beginning.

---

## 8. State Management

* Zustand for global state:

  * Chat state
  * Assignments
  * Study sessions
  * UI state

---

## 9. AI Strategy

**Phase 1:**

* Chat UI with mock responses

**Phase 2:**

* LLM integration (OpenAI / Gemini / local model)

**Phase 3:**

* Adaptive study planning (smart scheduling)

---

## 10. Development Rules

* Do NOT redesign UI
* Maintain visual consistency across all screens
* Use reusable components
* Keep code modular and scalable
* Follow clean architecture
* Ensure responsiveness

---

## 11. Roadmap

**Phase 1 — UI**

* Build all screens with mock data

**Phase 2 — Backend**

* Database + API development

**Phase 3 — Integration**

* Connect frontend with backend

**Phase 4 — AI**

* Implement intelligent features

---

## 12. Goal

* Build a production-ready SaaS application
* Make it internship and portfolio ready
* Maintain high UI quality + strong backend logic
* Ensure real usability (not just demo)
