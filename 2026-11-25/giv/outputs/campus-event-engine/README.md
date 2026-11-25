# Campus Event Engine & Ticket Hub

A full-stack campus events platform with an Express + Mongoose backend, a responsive browser frontend, MongoDB seed data, atomic seat booking, check-in, sponsor management, and aggregation analytics.

## Requirements

- Node.js 18 or newer
- MongoDB Community Server running locally, **or** a MongoDB Atlas connection string

## Setup & run

```bash
# 1. Install dependencies
npm install

# 2. Create your local environment file (already present as .env)
#    Edit .env if your MongoDB URI differs from the default
cp .env.example .env

# 3. Seed sample data (clubs, events, registrations)
npm run seed

# 4. Start the development server
npm run dev
```

Open **http://localhost:5000** — the frontend and API are served from the same Express server.

For production:

```bash
npm start
```

## Features

| Section | What it does |
|---|---|
| Events | Browse, search, filter by category / free / coding+hackathon, reserve a spot |
| Registrations | View all tickets, filter by department, check in attendees |
| Analytics | Overview totals, revenue by event & club, registrations by department, attendance turnout |
| Sponsors | Add a sponsor to any event from the event card |

## API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/clubs` | List campus clubs |
| GET | `/api/events` | List/search events (`search`, `category`, `freeOnly=true`, `tagged=true`) |
| GET | `/api/events/:id` | Get one event |
| GET | `/api/registrations?department=…` | List registrations, optionally by department |
| POST | `/api/events/:id/book` | Atomically reserve a seat and create a ticket |
| PATCH | `/api/registrations/:ticketId/check-in` | Mark a ticket checked in |
| POST | `/api/events/:id/sponsors` | Add a sponsor (no duplicates) |
| GET | `/api/analytics/overview` | Event, ticket, check-in, and revenue totals |
| GET | `/api/analytics/revenue` | Revenue and ticket totals by event and organiser club |
| GET | `/api/analytics/departments` | Registrations grouped by department |
| GET | `/api/analytics/turnout` | Checked-in count and turnout % by event |

## Project files

```
backend/src/server.js   — API routes and server startup
backend/src/models.js   — Mongoose schemas (Club, Event, Registration)
backend/src/seed.js     — Sample dataset
backend/src/db.js       — MongoDB connection helper
frontend/index.html     — App shell with Events, Registrations, Analytics views
frontend/app.js         — All frontend logic and API calls
frontend/styles.css     — Design system styles
.env                    — Local environment variables (never commit)
.env.example            — Safe template
```

## Push to GitHub

```bash
git init
git add .
git commit -m "Campus event engine"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

`.env` and `node_modules` are excluded by `.gitignore`.
