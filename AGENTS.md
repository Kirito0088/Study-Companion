# AGENTS.md — Study Companion AI Development Rules

## Purpose

This file defines strict rules and constraints for AI agents (Antigravity, Gemini, etc.) contributing to the Study Companion project.

Follow all instructions precisely. Do not deviate unless explicitly instructed.

---

## 1. Project Context

**Project Name:** Study Companion
**Type:** AI-powered study productivity SaaS (full-stack web app)

---

## 2. Tech Stack (STRICT — DO NOT CHANGE)

### Frontend

* Next.js (App Router, TypeScript)
* Tailwind CSS
* ShadCN UI
* Framer Motion

### Backend

* FastAPI (Python)

### Database

* PostgreSQL

---

## 3. Core Development Rules

### 3.1 UI / Design

* Do NOT redesign UI under any circumstance
* Follow existing design system strictly:

  * Dark theme (Indigo Slate)
  * Soft shadows, rounded cards
  * Clean spacing and hierarchy
  * Subtle animations only
* Maintain consistency across all screens

---

### 3.2 Code Quality

* Write modular, reusable components
* Avoid duplication
* Keep files small and focused
* Use clear naming conventions
* Follow clean architecture principles

---

### 3.3 Frontend Rules

* Use App Router (no Pages Router)
* Use component structure:

components/
ui/
shared/
features/

* Place logic in:

  * lib/api → API calls
  * lib/hooks → custom hooks
  * lib/utils → helpers

* Use Zustand for global state

* Avoid unnecessary client components

---

### 3.4 Backend Rules

Use production-grade FastAPI structure:

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

* Use `/api/v1/...` for all endpoints
* Keep routers thin
* Put logic in services
* Use Pydantic for validation
* Use SQLAlchemy for ORM

---

### 3.5 Database Rules

* Use PostgreSQL as primary database (NOT optional)

* Define proper relational models:

  * users
  * courses
  * study_sessions
  * assignments
  * chat_messages

* Do NOT rely on mock data for core logic

* Mock data can be used only for temporary UI testing

---

### 3.6 API Design Rules

* Follow REST principles
* Use consistent naming
* JSON request/response only

Required endpoints:

* GET    /api/v1/dashboard
* GET    /api/v1/assignments
* POST   /api/v1/assignments
* PUT    /api/v1/assignments/{id}
* DELETE /api/v1/assignments/{id}
* POST   /api/v1/chat/message

---

### 3.7 AI Feature Rules

Phase-based implementation:

**Phase 1:**

* UI + mock responses only

**Phase 2:**

* Integrate LLM (OpenAI / Gemini / local)

**Phase 3:**

* Add intelligent planning features

Do NOT skip phases.

---

## 4. What NOT to Do

* Do NOT change tech stack
* Do NOT redesign UI
* Do NOT introduce new frameworks unnecessarily
* Do NOT over-engineer
* Do NOT mix business logic into UI or routers
* Do NOT break folder structure

---

## 5. Output Expectations for AI Agents

When generating code:

* Provide complete files (not snippets)
* Ensure code is runnable
* Follow project structure exactly
* Keep implementation practical and minimal
* Avoid unnecessary explanations

---

## 6. Goal

Build a production-ready SaaS application with:

* Clean architecture
* High-quality UI
* Scalable backend
* Real-world usability

All decisions must support this goal.
