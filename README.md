# DuoWingo

A full-stack Duolingo-inspired language-learning application built with Next.js, TypeScript, FastAPI, and SQLite.

![Login page](https://github.com/AkankshRakesh/DuolingoClone/blob/master/frontend/image0.png)
![Leaderboard](https://github.com/AkankshRakesh/DuolingoClone/blob/master/frontend/image1.png)
![Lesson](https://github.com/AkankshRakesh/DuolingoClone/blob/master/frontend/image2.png)
![Profile page](https://github.com/AkankshRakesh/DuolingoClone/blob/master/frontend/image3.png)


## Features

- User signup and login
- Public demo/test account
- Protected routes and auth-route redirects
- Spanish learning path
- Units, skills, lessons, and exercises
- Multiple-choice, translation, matching, fill-blank, and type-answer exercises
- XP, streaks, hearts, gems, crowns, and daily XP goals
- Lesson completion and skill progression
- Skill unlocking
- Weekly leaderboard with seeded bot users
- Responsive Duolingo-inspired UI
- Independent frontend and backend deployments

## Tech Stack

### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Lucide React
- Sonner
- Geist fonts

### Backend
- Python
- FastAPI
- Pydantic
- SQLite
- Uvicorn
- FastAPI CORS middleware

## Repository Structure

```text
akankshrakesh-duolingoclone/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── api/
│       └── index.py
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── app/
    │   ├── layout.tsx
    │   ├── providers.tsx
    │   ├── app-shell.tsx
    │   ├── page.tsx
    │   ├── (auth)/
    │   │   ├── layout.tsx
    │   │   └── auth/page.tsx
    │   ├── (protected)/
    │   │   ├── layout.tsx
    │   │   ├── learningpath/page.tsx
    │   │   ├── lesson/[lessonId]/page.tsx
    │   │   ├── leaderboard/page.tsx
    │   │   └── profile/page.tsx
    │   ├── components/
    │   │   ├── AuthRoute.tsx
    │   │   ├── ProtectedRoute.tsx
    │   │   ├── LessonPlayer.tsx
    │   │   ├── TopBar.tsx
    │   │   ├── Nav.tsx
    │   │   └── exercises/
    │   └── lib/
    │       ├── db.ts
    │       ├── store.tsx
    │       ├── auth.ts
    │       └── utils.ts
    └── types/
```

## Architecture

```text
Browser
   |
   v
Next.js Frontend
   |
   | REST / JSON
   v
FastAPI Backend
   |
   v
SQLite Database
```

The frontend communicates with the backend through the API client in `frontend/app/lib/db.ts`. The backend exposes REST endpoints from `backend/main.py`.

The frontend and backend are deployed as separate Vercel projects.

## Frontend Architecture

The application uses the Next.js App Router.

### Global providers

`app/providers.tsx` contains the application-wide providers:

```text
ThemeProvider
    |
AppProvider
    |
children + Toaster
```

This keeps application state and theme state available to both auth and protected pages.

### App shell

`app/app-shell.tsx` contains the authenticated application UI:

```text
AppShell
├── TopBar
├── Nav
└── Main content
```

The shell is separate from `AppProvider`, so `/auth` does not need to display the normal application navigation.

### Route groups

```text
app/(auth)/auth/page.tsx
```

maps to:

```text
/auth
```

and:

```text
app/(protected)/learningpath/page.tsx
```

maps to:

```text
/learningpath
```

Dynamic lessons use:

```text
app/(protected)/lesson/[lessonId]/page.tsx
```

which maps to:

```text
/lesson/{lessonId}
```

### Route protection

`AuthRoute` redirects authenticated users from `/auth` to `/learningpath`.

`ProtectedRoute` redirects unauthenticated users from protected pages to `/auth`.

Protected pages include:

```text
/learningpath
/lesson/{lessonId}
/leaderboard
/profile
```

## Backend Architecture

`backend/main.py` contains:

- FastAPI application
- Pydantic request models
- SQLite connection helpers
- Database schema creation
- Seed data
- Authentication endpoints
- Learner endpoints
- Course-content endpoints
- Progress endpoints
- XP endpoints
- Leaderboard endpoints
- CORS configuration

`backend/api/index.py` is the Vercel Python entry point for the separately deployed backend.

The API uses a simple JSON REST interface.

## Database Schema

The backend creates the SQLite schema automatically.

### Entity relationships

```text
users
  |
  v
learners
  |
  +--> skill_progress --> skills --> units --> languages
  |
  +--> lesson_completions --> lessons --> exercises
  |
  +--> daily_xp_log
  |
  +--> leaderboard_entries
```

### `users`

Authentication/account data:

| Column | Description |
|---|---|
| id | Primary key |
| username | Unique username |
| email | Unique email |
| password_hash | Stored password hash |
| display_name | User display name |
| created_at | Creation timestamp |

### `learners`

Learning/game state:

| Column | Description |
|---|---|
| id | Learner ID |
| user_id | Related user |
| username | Username |
| display_name | Display name |
| avatar_url | Optional avatar |
| total_xp | Total XP |
| streak_days | Streak |
| hearts | Current hearts |
| max_hearts | Maximum hearts |
| gems | Gems |
| daily_xp_goal | Daily XP goal |
| daily_xp_earned | Daily XP |
| last_activity_date | Last activity |

### `languages`

| Column | Description |
|---|---|
| id | Language ID |
| code | Language code |
| name | Language name |
| flag_emoji | Flag |

### `units`

| Column | Description |
|---|---|
| id | Unit ID |
| language_id | Parent language |
| title | Unit title |
| description | Unit description |
| color | UI color |
| sort_order | Display order |

### `skills`

| Column | Description |
|---|---|
| id | Skill ID |
| unit_id | Parent unit |
| title | Skill title |
| description | Skill description |
| icon | Skill icon |
| sort_order | Display order |
| required_crowns | Required crowns |
| total_lessons | Number of lessons |

### `lessons`

| Column | Description |
|---|---|
| id | Lesson ID |
| skill_id | Parent skill |
| title | Lesson title |
| sort_order | Display order |
| xp_reward | Base XP reward |

### `exercises`

| Column | Description |
|---|---|
| id | Exercise ID |
| lesson_id | Parent lesson |
| type | Exercise type |
| prompt | Question |
| prompt_translation | Translation |
| options | JSON options |
| correct_answer | Correct answer |
| explanation | Explanation |
| sort_order | Display order |

Supported exercise types:

```text
multiple_choice
translate
match_pairs
fill_blank
type_answer
```

### `skill_progress`

Tracks a learner's progress for each skill.

Fields include:

```text
id
user_id
skill_id
crowns_earned
is_unlocked
is_completed
lessons_completed
```

There is a unique `(user_id, skill_id)` constraint.

### `lesson_completions`

Tracks completed lessons:

```text
id
user_id
lesson_id
xp_earned
hearts_remaining
completed_at
```

There is a unique `(user_id, lesson_id)` constraint.

### `daily_xp_log`

Tracks XP by date:

```text
id
user_id
log_date
xp_earned
```

There is a unique `(user_id, log_date)` constraint.

### `leaderboard_entries`

Stores weekly leaderboard entries:

```text
id
user_id
display_name
username
avatar_color
weekly_xp
is_current_user
is_bot
```

## Seeded Course

The current seed data contains Spanish:

```text
Spanish 🇪🇸
└── Section 1: Basics
    ├── Greetings
    │   ├── Basic Greetings
    │   ├── Introductions
    │   └── Goodbyes
    ├── Numbers
    │   ├── Numbers 1-5
    │   ├── Numbers 6-10
    │   └── Counting Practice
    └── Food
        ├── Common Foods
        ├── Ordering Food
        └── At the Restaurant
```

## API Overview

Base local URL:

```text
http://localhost:8001
```

### Health

```http
GET /health
```

Returns:

```json
{ "ok": true }
```

### Authentication

```http
POST /auth/signup
POST /auth/login
```

Signup body:

```json
{
  "username": "a",
  "email": "a@example.com",
  "password": "secret",
  "display_name": "a"
}
```

Login body:

```json
{
  "username": "a",
  "password": "secret"
}
```

### Learners

```http
GET   /learners/{learner_id}
PATCH /learners/{learner_id}

GET   /learners/{learner_id}/progress
GET   /learners/{learner_id}/completed-lessons

POST  /learners/{learner_id}/lesson-completions
PATCH /learners/{learner_id}/skill-progress/{skill_id}
```

### Daily XP

```http
GET  /learners/{learner_id}/daily-xp
POST /learners/{learner_id}/daily-xp
```

### Leaderboard

```http
GET  /learners/{learner_id}/leaderboard
POST /learners/{learner_id}/leaderboard-xp
```

### Course content

```http
GET /units
GET /lessons/by-skill
GET /lessons/{lesson_id}/exercises
GET /lessons/{lesson_id}/skill-id
GET /skills/{skill_id}
```

FastAPI's interactive API documentation is available locally at:

```text
http://localhost:8001/docs
```

## Local Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd akankshrakesh-duolingoclone
```

### 2. Backend

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

The backend will run at:

```text
http://localhost:8001
```

### 3. Frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend will run at:

```text
http://localhost:3000
```

### 4. Production frontend test

```powershell
npm run build
npm run start
```

## Environment Variables

The frontend uses:

```text
NEXT_PUBLIC_API_BASE_URL
```

Local development:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8001
```

Production example:

```env
NEXT_PUBLIC_API_BASE_URL=https://duowingo-be.vercel.app
```

The production frontend must be redeployed after changing a `NEXT_PUBLIC_*` variable.

## CORS

The backend must allow the exact frontend origin.

Example:

```python
allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://duolingo-seven.vercel.app",
]
```

Do not include a trailing slash in the origin.

## Deployment

### Frontend Vercel Project

Set the Vercel Root Directory to:

```text
frontend
```

Framework:

```text
Next.js
```

Production environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://duowingo-be.vercel.app
```

### Backend Vercel Project

Set the Vercel Root Directory to:

```text
backend
```

The backend contains:

```text
backend/
├── main.py
├── requirements.txt
└── api/
    └── index.py
```

After deployment, verify:

```text
https://YOUR-BACKEND-DOMAIN/health
```

Then verify the frontend can call the backend.

## Demo Account

The seeded demo account is:

```text
Username: testuser
Password: password123
```

The frontend includes a **Login with Test Account** button.

This account is intended for demonstration/testing only.

## Learning Flow

```text
Login / Signup
      |
      v
Learning Path
      |
      v
Select Skill
      |
      v
Select Lesson
      |
      v
Lesson Player
      |
      v
Exercises
      |
      +--> Correct -> Continue
      |
      +--> Incorrect -> Lose Heart
      |
      v
Lesson Complete
      |
      +--> Award XP
      +--> Record lesson completion
      +--> Update skill progress
      +--> Unlock next skill when applicable
      |
      v
Return to learning path
```

## Important Notes

### SQLite and Vercel

SQLite is appropriate for local development and a small educational/demo workload, but Vercel's serverless filesystem should not be treated as a persistent database.

For a production deployment, use a persistent hosted database such as PostgreSQL.

### Password security

The current project uses a simple custom hash for the demo. This is not suitable for real accounts.

For production authentication, use a password hashing algorithm/library such as Argon2 or bcrypt.

### Authorization

The current API accepts learner IDs directly in routes and does not provide full server-side authorization.

A production version should authenticate each request and verify that the authenticated user owns the learner resource being modified.

## Useful Commands

Backend:

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8001
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Frontend production build:

```powershell
npm run build
npm run start
```

## Future Improvements

- PostgreSQL or another persistent database
- Argon2/bcrypt password hashing
- HTTP-only session cookies
- Server-side authorization
- More languages and courses
- More lessons and exercises
- Audio/pronunciation exercises
- Spaced repetition
- Achievements
- Friends/social features
- Improved leaderboard periods
- Automated frontend/backend tests
- API integration tests
- CI/CD
- Database migrations
- Rate limiting
- API versioning