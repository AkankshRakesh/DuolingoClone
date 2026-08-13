from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "duolingo.sqlite3"



class AuthSignup(BaseModel):
    username: str
    email: str
    password: str
    display_name: str


class AuthLogin(BaseModel):
    username: str
    password: str


class LearnerUpdate(BaseModel):
    total_xp: int | None = None
    streak_days: int | None = None
    hearts: int | None = None
    max_hearts: int | None = None
    gems: int | None = None
    daily_xp_goal: int | None = None
    daily_xp_earned: int | None = None
    last_activity_date: str | None = None
    display_name: str | None = None


class DailyXpUpsert(BaseModel):
    date: str
    xp_earned: int


class LeaderboardXpUpdate(BaseModel):
    amount: int


class LessonCompletionCreate(BaseModel):
    lesson_id: str
    xp_earned: int
    hearts_remaining: int


class SkillProgressUpdate(BaseModel):
    lessons_completed: int
    is_completed: bool
    crowns_earned: int


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def rid() -> str:
    return str(uuid.uuid4())


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return dict(row)


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def simple_hash(value: str) -> str:
    hash_value = 0
    for char in value:
        hash_value = ((hash_value << 5) - hash_value + ord(char)) & 0xFFFFFFFF
        if hash_value >= 0x80000000:
            hash_value -= 0x100000000
    return str(hash_value)


def create_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          display_name TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS learners (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          display_name TEXT NOT NULL,
          avatar_url TEXT,
          total_xp INTEGER DEFAULT 0,
          streak_days INTEGER DEFAULT 0,
          hearts INTEGER DEFAULT 5,
          max_hearts INTEGER DEFAULT 5,
          gems INTEGER DEFAULT 500,
          daily_xp_goal INTEGER DEFAULT 50,
          daily_xp_earned INTEGER DEFAULT 0,
          last_activity_date TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS languages (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL,
          name TEXT NOT NULL,
          flag_emoji TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS units (
          id TEXT PRIMARY KEY,
          language_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          color TEXT,
          sort_order INTEGER DEFAULT 0,
          FOREIGN KEY (language_id) REFERENCES languages(id)
        );

        CREATE TABLE IF NOT EXISTS skills (
          id TEXT PRIMARY KEY,
          unit_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          icon TEXT,
          sort_order INTEGER DEFAULT 0,
          required_crowns INTEGER DEFAULT 0,
          total_lessons INTEGER DEFAULT 3,
          FOREIGN KEY (unit_id) REFERENCES units(id)
        );

        CREATE TABLE IF NOT EXISTS lessons (
          id TEXT PRIMARY KEY,
          skill_id TEXT NOT NULL,
          title TEXT NOT NULL,
          sort_order INTEGER DEFAULT 0,
          xp_reward INTEGER DEFAULT 10,
          FOREIGN KEY (skill_id) REFERENCES skills(id)
        );

        CREATE TABLE IF NOT EXISTS exercises (
          id TEXT PRIMARY KEY,
          lesson_id TEXT NOT NULL,
          type TEXT NOT NULL,
          prompt TEXT NOT NULL,
          prompt_translation TEXT,
          options TEXT,
          correct_answer TEXT NOT NULL,
          explanation TEXT,
          sort_order INTEGER DEFAULT 0,
          FOREIGN KEY (lesson_id) REFERENCES lessons(id)
        );

        CREATE TABLE IF NOT EXISTS skill_progress (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          skill_id TEXT NOT NULL,
          crowns_earned INTEGER DEFAULT 0,
          is_unlocked INTEGER DEFAULT 0,
          is_completed INTEGER DEFAULT 0,
          lessons_completed INTEGER DEFAULT 0,
          UNIQUE(user_id, skill_id),
          FOREIGN KEY (user_id) REFERENCES learners(id),
          FOREIGN KEY (skill_id) REFERENCES skills(id)
        );

        CREATE TABLE IF NOT EXISTS lesson_completions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          lesson_id TEXT NOT NULL,
          xp_earned INTEGER DEFAULT 0,
          hearts_remaining INTEGER DEFAULT 5,
          completed_at TEXT NOT NULL,
          UNIQUE(user_id, lesson_id),
          FOREIGN KEY (user_id) REFERENCES learners(id),
          FOREIGN KEY (lesson_id) REFERENCES lessons(id)
        );

        CREATE TABLE IF NOT EXISTS daily_xp_log (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          log_date TEXT NOT NULL,
          xp_earned INTEGER DEFAULT 0,
          UNIQUE(user_id, log_date),
          FOREIGN KEY (user_id) REFERENCES learners(id)
        );

        CREATE TABLE IF NOT EXISTS leaderboard_entries (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          display_name TEXT NOT NULL,
          username TEXT NOT NULL,
          avatar_color TEXT NOT NULL,
          weekly_xp INTEGER DEFAULT 0,
          is_current_user INTEGER DEFAULT 0,
          is_bot INTEGER DEFAULT 1
        );
        """
    )


EXERCISES: dict[tuple[str, int], list[dict[str, Any]]] = {
    ("skill-1", 0): [
        {"type": "multiple_choice", "prompt": 'How do you say "Hello" in Spanish?', "translation": None, "options": ["Hola", "Adiós", "Gracias", "Por favor"], "answer": "Hola", "explanation": '"Hola" is the standard greeting in Spanish.', "order": 0},
        {"type": "translate", "prompt": "Buenos días", "translation": "Good morning", "options": ["Good", "morning", "day", "night", "Bad"], "answer": "Good morning", "explanation": None, "order": 1},
        {"type": "match_pairs", "prompt": "Match the Spanish greetings to their English meanings", "translation": None, "options": [{"spanish": "Hola", "english": "Hello"}, {"spanish": "Adiós", "english": "Goodbye"}, {"spanish": "Gracias", "english": "Thank you"}, {"spanish": "Por favor", "english": "Please"}], "answer": "Hola=Hello|Adiós=Goodbye|Gracias=Thank you|Por favor=Please", "explanation": None, "order": 2},
        {"type": "fill_blank", "prompt": "______ días (Good morning)", "translation": None, "options": ["Buenos", "Malos", "Grandes", "Nuevos"], "answer": "Buenos", "explanation": '"Buenos días" means "Good morning".', "order": 3},
        {"type": "type_answer", "prompt": 'Type "Thank you" in Spanish', "translation": None, "options": None, "answer": "Gracias", "explanation": None, "order": 4},
    ],
    ("skill-1", 1): [
        {"type": "multiple_choice", "prompt": 'What does "Me llamo" mean?', "translation": None, "options": ["My name is", "I am from", "How are you", "Nice to meet you"], "answer": "My name is", "explanation": '"Me llamo" is used to introduce yourself.', "order": 0},
        {"type": "translate", "prompt": "Me llamo Juan", "translation": "My name is Juan", "options": ["My", "name", "is", "Juan", "your", "what"], "answer": "My name is Juan", "explanation": None, "order": 1},
        {"type": "fill_blank", "prompt": "Me ______ Ana (My name is Ana)", "translation": None, "options": ["llamo", "gusta", "quiero", "tengo"], "answer": "llamo", "explanation": '"Me llamo" means "My name is".', "order": 2},
        {"type": "type_answer", "prompt": 'Type "Nice to meet you" in Spanish', "translation": None, "options": None, "answer": "Mucho gusto", "explanation": '"Mucho gusto" is a common way to say "Nice to meet you".', "order": 3},
        {"type": "match_pairs", "prompt": "Match the introductions", "translation": None, "options": [{"spanish": "Me llamo", "english": "My name is"}, {"spanish": "Mucho gusto", "english": "Nice to meet you"}, {"spanish": "¿Y tú?", "english": "And you?"}, {"spanish": "Encantado", "english": "Delighted"}], "answer": "Me llamo=My name is|Mucho gusto=Nice to meet you|¿Y tú?=And you?|Encantado=Delighted", "explanation": None, "order": 4},
    ],
    ("skill-1", 2): [
        {"type": "multiple_choice", "prompt": 'How do you say "Goodbye" in Spanish?', "translation": None, "options": ["Adiós", "Hola", "Gracias", "Buenas"], "answer": "Adiós", "explanation": '"Adiós" is the standard farewell.', "order": 0},
        {"type": "translate", "prompt": "Hasta luego", "translation": "See you later", "options": ["See", "you", "later", "never", "soon", "tomorrow"], "answer": "See you later", "explanation": None, "order": 1},
        {"type": "type_answer", "prompt": 'Type "See you tomorrow" in Spanish', "translation": None, "options": None, "answer": "Hasta mañana", "explanation": None, "order": 2},
        {"type": "fill_blank", "prompt": "______ pronto (See you soon)", "translation": None, "options": ["Hasta", "Adiós", "Buenas", "Vamos"], "answer": "Hasta", "explanation": '"Hasta pronto" means "See you soon".', "order": 3},
        {"type": "match_pairs", "prompt": "Match the farewells", "translation": None, "options": [{"spanish": "Adiós", "english": "Goodbye"}, {"spanish": "Hasta luego", "english": "See you later"}, {"spanish": "Hasta mañana", "english": "See you tomorrow"}, {"spanish": "Chao", "english": "Bye"}], "answer": "Adiós=Goodbye|Hasta luego=See you later|Hasta mañana=See you tomorrow|Chao=Bye", "explanation": None, "order": 4},
    ],
    ("skill-2", 0): [
        {"type": "multiple_choice", "prompt": 'What is "uno" in English?', "translation": None, "options": ["One", "Two", "Three", "Four"], "answer": "One", "explanation": '"Uno" means "One".', "order": 0},
        {"type": "translate", "prompt": "tres", "translation": "Three", "options": ["Three", "Two", "One", "Five", "Four", "Six"], "answer": "Three", "explanation": None, "order": 1},
        {"type": "fill_blank", "prompt": "______ = Two", "translation": None, "options": ["Dos", "Uno", "Tres", "Cinco"], "answer": "Dos", "explanation": '"Dos" means "Two".', "order": 2},
        {"type": "type_answer", "prompt": 'Type "Five" in Spanish', "translation": None, "options": None, "answer": "Cinco", "explanation": None, "order": 3},
        {"type": "match_pairs", "prompt": "Match numbers 1-5", "translation": None, "options": [{"spanish": "Uno", "english": "One"}, {"spanish": "Dos", "english": "Two"}, {"spanish": "Tres", "english": "Three"}, {"spanish": "Cuatro", "english": "Four"}, {"spanish": "Cinco", "english": "Five"}], "answer": "Uno=One|Dos=Two|Tres=Three|Cuatro=Four|Cinco=Five", "explanation": None, "order": 4},
    ],
    ("skill-2", 1): [
        {"type": "multiple_choice", "prompt": 'What is "siete" in English?', "translation": None, "options": ["Seven", "Eight", "Nine", "Ten"], "answer": "Seven", "explanation": '"Siete" means "Seven".', "order": 0},
        {"type": "translate", "prompt": "diez", "translation": "Ten", "options": ["Ten", "Nine", "Eight", "Seven", "Six", "Five"], "answer": "Ten", "explanation": None, "order": 1},
        {"type": "fill_blank", "prompt": "______ = Eight", "translation": None, "options": ["Ocho", "Nueve", "Diez", "Seis"], "answer": "Ocho", "explanation": '"Ocho" means "Eight".', "order": 2},
        {"type": "type_answer", "prompt": 'Type "Nine" in Spanish', "translation": None, "options": None, "answer": "Nueve", "explanation": None, "order": 3},
        {"type": "match_pairs", "prompt": "Match numbers 6-10", "translation": None, "options": [{"spanish": "Seis", "english": "Six"}, {"spanish": "Siete", "english": "Seven"}, {"spanish": "Ocho", "english": "Eight"}, {"spanish": "Nueve", "english": "Nine"}, {"spanish": "Diez", "english": "Ten"}], "answer": "Seis=Six|Siete=Seven|Ocho=Eight|Nueve=Nine|Diez=Ten", "explanation": None, "order": 4},
    ],
    ("skill-2", 2): [
        {"type": "multiple_choice", "prompt": 'What is "dos + tres"?', "translation": None, "options": ["Cinco", "Cuatro", "Seis", "Uno"], "answer": "Cinco", "explanation": "2 + 3 = 5 (cinco).", "order": 0},
        {"type": "translate", "prompt": "cinco más dos", "translation": "Five plus two", "options": ["Five", "plus", "two", "minus", "three", "seven"], "answer": "Five plus two", "explanation": None, "order": 1},
        {"type": "type_answer", "prompt": 'Type "Ten" in Spanish', "translation": None, "options": None, "answer": "Diez", "explanation": None, "order": 2},
        {"type": "fill_blank", "prompt": "uno + uno = ______", "translation": None, "options": ["Dos", "Tres", "Cero", "Cuatro"], "answer": "Dos", "explanation": "1 + 1 = 2 (dos).", "order": 3},
        {"type": "match_pairs", "prompt": "Match the math", "translation": None, "options": [{"spanish": "Uno + Uno", "english": "Dos"}, {"spanish": "Dos + Dos", "english": "Cuatro"}, {"spanish": "Cinco + Cinco", "english": "Diez"}, {"spanish": "Tres + Dos", "english": "Cinco"}], "answer": "Uno + Uno=Dos|Dos + Dos=Cuatro|Cinco + Cinco=Diez|Tres + Dos=Cinco", "explanation": None, "order": 4},
    ],
    ("skill-3", 0): [
        {"type": "multiple_choice", "prompt": 'What does "pan" mean?', "translation": None, "options": ["Bread", "Water", "Milk", "Cheese"], "answer": "Bread", "explanation": '"Pan" means "Bread".', "order": 0},
        {"type": "translate", "prompt": "agua", "translation": "Water", "options": ["Water", "Bread", "Milk", "Cheese", "Wine", "Juice"], "answer": "Water", "explanation": None, "order": 1},
        {"type": "fill_blank", "prompt": "______ = Milk", "translation": None, "options": ["Leche", "Agua", "Pan", "Queso"], "answer": "Leche", "explanation": '"Leche" means "Milk".', "order": 2},
        {"type": "type_answer", "prompt": 'Type "Cheese" in Spanish', "translation": None, "options": None, "answer": "Queso", "explanation": None, "order": 3},
        {"type": "match_pairs", "prompt": "Match the foods", "translation": None, "options": [{"spanish": "Pan", "english": "Bread"}, {"spanish": "Agua", "english": "Water"}, {"spanish": "Leche", "english": "Milk"}, {"spanish": "Queso", "english": "Cheese"}], "answer": "Pan=Bread|Agua=Water|Leche=Milk|Queso=Cheese", "explanation": None, "order": 4},
    ],
    ("skill-3", 1): [
        {"type": "multiple_choice", "prompt": 'How do you say "I want" in Spanish?', "translation": None, "options": ["Quiero", "Tengo", "Soy", "Voy"], "answer": "Quiero", "explanation": '"Quiero" means "I want".', "order": 0},
        {"type": "translate", "prompt": "Quiero un café", "translation": "I want a coffee", "options": ["I", "want", "a", "coffee", "tea", "water", "need"], "answer": "I want a coffee", "explanation": None, "order": 1},
        {"type": "fill_blank", "prompt": "______ un té (I want a tea)", "translation": None, "options": ["Quiero", "Tengo", "Soy", "Voy"], "answer": "Quiero", "explanation": '"Quiero" means "I want".', "order": 2},
        {"type": "type_answer", "prompt": 'Type "I want water" in Spanish', "translation": None, "options": None, "answer": "Quiero agua", "explanation": None, "order": 3},
        {"type": "match_pairs", "prompt": "Match the phrases", "translation": None, "options": [{"spanish": "Quiero", "english": "I want"}, {"spanish": "Necesito", "english": "I need"}, {"spanish": "Me gusta", "english": "I like"}, {"spanish": "Tengo", "english": "I have"}], "answer": "Quiero=I want|Necesito=I need|Me gusta=I like|Tengo=I have", "explanation": None, "order": 4},
    ],
    ("skill-3", 2): [
        {"type": "multiple_choice", "prompt": 'What does "la cuenta" mean at a restaurant?', "translation": None, "options": ["The bill", "The menu", "The table", "The waiter"], "answer": "The bill", "explanation": '"La cuenta" means "The bill".', "order": 0},
        {"type": "translate", "prompt": "La cuenta, por favor", "translation": "The bill, please", "options": ["The", "bill", "please", "menu", "water", "food"], "answer": "The bill please", "explanation": None, "order": 1},
        {"type": "fill_blank", "prompt": "______, por favor (The menu, please)", "translation": None, "options": ["El menú", "La cuenta", "El agua", "El pan"], "answer": "El menú", "explanation": '"El menú" means "The menu".', "order": 2},
        {"type": "type_answer", "prompt": 'Type "The bill, please" in Spanish', "translation": None, "options": None, "answer": "La cuenta por favor", "explanation": None, "order": 3},
        {"type": "match_pairs", "prompt": "Match restaurant phrases", "translation": None, "options": [{"spanish": "La cuenta", "english": "The bill"}, {"spanish": "El menú", "english": "The menu"}, {"spanish": "El camarero", "english": "The waiter"}, {"spanish": "La mesa", "english": "The table"}], "answer": "La cuenta=The bill|El menú=The menu|El camarero=The waiter|La mesa=The table", "explanation": None, "order": 4},
    ],
}


def seed_exercises(conn: sqlite3.Connection, lesson_id: str, skill_id: str, lesson_idx: int) -> None:
    for exercise in EXERCISES[(skill_id, lesson_idx)]:
        conn.execute(
            """
            INSERT INTO exercises
              (id, lesson_id, type, prompt, prompt_translation, options, correct_answer, explanation, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rid(),
                lesson_id,
                exercise["type"],
                exercise["prompt"],
                exercise["translation"],
                json.dumps(exercise["options"]) if exercise["options"] is not None else None,
                exercise["answer"],
                exercise["explanation"],
                exercise["order"],
            ),
        )


def seed_data(conn: sqlite3.Connection) -> None:
    if conn.execute("SELECT COUNT(*) FROM languages").fetchone()[0] > 0:
        return

    lang_id = "lang-es"
    unit_id = "unit-1"

    conn.execute(
        "INSERT INTO languages (id, code, name, flag_emoji) VALUES (?, ?, ?, ?)",
        (lang_id, "es", "Spanish", "🇪🇸"),
    )
    conn.execute(
        "INSERT INTO units (id, language_id, title, description, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        (unit_id, lang_id, "Section 1: Basics", "Learn the fundamentals of Spanish", "#58CC02", 0),
    )

    skills = [
        ("skill-1", "Greetings", "Say hello and introduce yourself", "👋", 0),
        ("skill-2", "Numbers", "Count from 1 to 10", "🔢", 1),
        ("skill-3", "Food", "Order food and drinks", "🍽️", 2),
    ]
    for skill_id, title, description, icon, order in skills:
        conn.execute(
            """
            INSERT INTO skills
              (id, unit_id, title, description, icon, sort_order, required_crowns, total_lessons)
            VALUES (?, ?, ?, ?, ?, ?, 0, 3)
            """,
            (skill_id, unit_id, title, description, icon, order),
        )

    lesson_defs = {
        "skill-1": ["Basic Greetings", "Introductions", "Goodbyes"],
        "skill-2": ["Numbers 1-5", "Numbers 6-10", "Counting Practice"],
        "skill-3": ["Common Foods", "Ordering Food", "At the Restaurant"],
    }
    for skill_id, lessons in lesson_defs.items():
        for index, title in enumerate(lessons):
            lesson_id = f"{skill_id}-lesson-{index}"
            conn.execute(
                "INSERT INTO lessons (id, skill_id, title, sort_order, xp_reward) VALUES (?, ?, ?, ?, 10)",
                (lesson_id, skill_id, title, index),
            )
            seed_exercises(conn, lesson_id, skill_id, index)

    bots = [
        ("Maria", "#FF4B4B", 850),
        ("Carlos", "#1CB0F6", 720),
        ("Sofia", "#58CC02", 610),
        ("Diego", "#CE82FF", 480),
        ("Elena", "#FF9600", 350),
        ("Pablo", "#FFD900", 200),
    ]
    for name, color, xp in bots:
        conn.execute(
            """
            INSERT INTO leaderboard_entries
              (id, display_name, username, avatar_color, weekly_xp, is_current_user, is_bot)
            VALUES (?, ?, ?, ?, ?, 0, 1)
            """,
            (rid(), name, name.lower(), color, xp),
        )
    conn.commit()


def initialize_database() -> None:
    with connect() as conn:
        create_schema(conn)
        seed_data(conn)


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/auth/signup")
def signup(payload: AuthSignup) -> dict[str, Any]:
    username = payload.username.strip()
    email = payload.email.strip()
    display_name = payload.display_name.strip()

    with connect() as conn:
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ? OR email = ?",
            (username, email),
        ).fetchone()
        if existing:
            return {"ok": False, "error": "Username or email already taken"}

        user_id = rid()
        learner_id = rid()
        now = datetime.now(timezone.utc).isoformat()
        conn.execute(
            """
            INSERT INTO users (id, username, email, password_hash, display_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, username, email, simple_hash(payload.password), display_name, now),
        )
        conn.execute(
            """
            INSERT INTO learners
              (id, user_id, username, display_name, avatar_url, total_xp, streak_days, hearts, max_hearts, gems, daily_xp_goal, daily_xp_earned, last_activity_date)
            VALUES (?, ?, ?, ?, NULL, 0, 0, 5, 5, 500, 50, 0, NULL)
            """,
            (learner_id, user_id, username, display_name),
        )

        skills = conn.execute("SELECT id FROM skills ORDER BY sort_order").fetchall()
        for index, skill in enumerate(skills):
            conn.execute(
                """
                INSERT INTO skill_progress
                  (id, user_id, skill_id, crowns_earned, is_unlocked, is_completed, lessons_completed)
                VALUES (?, ?, ?, 0, ?, 0, 0)
                """,
                (rid(), learner_id, skill["id"], 1 if index == 0 else 0),
            )

        conn.execute(
            """
            INSERT INTO leaderboard_entries
              (id, user_id, display_name, username, avatar_color, weekly_xp, is_current_user, is_bot)
            VALUES (?, ?, ?, ?, ?, 0, 1, 0)
            """,
            (rid(), learner_id, display_name, username, "#1CB0F6"),
        )
        conn.commit()
        learner = row_to_dict(conn.execute("SELECT * FROM learners WHERE id = ?", (learner_id,)).fetchone())
        return {"ok": True, "learner": learner}


@app.post("/auth/login")
def login(payload: AuthLogin) -> dict[str, Any]:
    with connect() as conn:
        user = conn.execute(
            "SELECT id, password_hash FROM users WHERE username = ?",
            (payload.username.strip(),),
        ).fetchone()
        if user is None:
            return {"ok": False, "error": "User not found"}
        if user["password_hash"] != simple_hash(payload.password):
            return {"ok": False, "error": "Incorrect password"}

        learner = row_to_dict(conn.execute("SELECT * FROM learners WHERE user_id = ?", (user["id"],)).fetchone())
        if learner is None:
            return {"ok": False, "error": "Learner record not found"}
        return {"ok": True, "learner": learner}


@app.get("/learners/{learner_id}")
def get_learner(learner_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        return row_to_dict(conn.execute("SELECT * FROM learners WHERE id = ?", (learner_id,)).fetchone())


@app.patch("/learners/{learner_id}")
def update_learner(learner_id: str, updates: LearnerUpdate) -> dict[str, Any] | None:
    values = updates.model_dump(exclude_unset=True)
    if values:
        assignments = ", ".join(f"{key} = ?" for key in values)
        with connect() as conn:
            conn.execute(
                f"UPDATE learners SET {assignments} WHERE id = ?",
                (*values.values(), learner_id),
            )
            conn.commit()
            return row_to_dict(conn.execute("SELECT * FROM learners WHERE id = ?", (learner_id,)).fetchone())
    return get_learner(learner_id)


@app.get("/learners/{learner_id}/progress")
def get_skill_progress(learner_id: str) -> dict[str, dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM skill_progress WHERE user_id = ?", (learner_id,)).fetchall()
        return {row["skill_id"]: dict(row) for row in rows}


@app.get("/learners/{learner_id}/completed-lessons")
def get_completed_lessons(learner_id: str) -> list[str]:
    with connect() as conn:
        rows = conn.execute("SELECT lesson_id FROM lesson_completions WHERE user_id = ?", (learner_id,)).fetchall()
        return [row["lesson_id"] for row in rows]


@app.post("/learners/{learner_id}/lesson-completions")
def complete_lesson(learner_id: str, payload: LessonCompletionCreate) -> dict[str, bool]:
    with connect() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO lesson_completions
              (id, user_id, lesson_id, xp_earned, hearts_remaining, completed_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (rid(), learner_id, payload.lesson_id, payload.xp_earned, payload.hearts_remaining, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
        return {"ok": True}


@app.patch("/learners/{learner_id}/skill-progress/{skill_id}")
def update_skill_progress(learner_id: str, skill_id: str, payload: SkillProgressUpdate) -> dict[str, bool]:
    with connect() as conn:
        conn.execute(
            """
            UPDATE skill_progress
            SET lessons_completed = ?, is_completed = ?, crowns_earned = ?
            WHERE user_id = ? AND skill_id = ?
            """,
            (payload.lessons_completed, 1 if payload.is_completed else 0, payload.crowns_earned, learner_id, skill_id),
        )
        if payload.is_completed:
            skills = conn.execute("SELECT id FROM skills ORDER BY sort_order").fetchall()
            skill_ids = [skill["id"] for skill in skills]
            if skill_id in skill_ids:
                index = skill_ids.index(skill_id)
                if index + 1 < len(skill_ids):
                    conn.execute(
                        "UPDATE skill_progress SET is_unlocked = 1 WHERE user_id = ? AND skill_id = ?",
                        (learner_id, skill_ids[index + 1]),
                    )
        conn.commit()
        return {"ok": True}


@app.get("/learners/{learner_id}/daily-xp")
def get_daily_xp(learner_id: str) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT log_date, xp_earned FROM daily_xp_log WHERE user_id = ? ORDER BY log_date LIMIT 7",
            (learner_id,),
        ).fetchall()
        return rows_to_dicts(rows)


@app.post("/learners/{learner_id}/daily-xp")
def upsert_daily_xp(learner_id: str, payload: DailyXpUpsert) -> dict[str, bool]:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO daily_xp_log (id, user_id, log_date, xp_earned)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, log_date) DO UPDATE SET xp_earned = excluded.xp_earned
            """,
            (rid(), learner_id, payload.date, payload.xp_earned),
        )
        conn.commit()
        return {"ok": True}


@app.get("/learners/{learner_id}/leaderboard")
def get_leaderboard(learner_id: str) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM leaderboard_entries ORDER BY weekly_xp DESC").fetchall()
        entries = rows_to_dicts(rows)
        for entry in entries:
            entry["is_current_user"] = 1 if entry["is_current_user"] == 1 or entry["user_id"] == learner_id else 0
        return entries


@app.post("/learners/{learner_id}/leaderboard-xp")
def update_leaderboard_xp(learner_id: str, payload: LeaderboardXpUpdate) -> dict[str, bool]:
    with connect() as conn:
        conn.execute(
            "UPDATE leaderboard_entries SET weekly_xp = weekly_xp + ? WHERE user_id = ?",
            (payload.amount, learner_id),
        )
        conn.commit()
        return {"ok": True}


@app.get("/units")
def get_units() -> list[dict[str, Any]]:
    with connect() as conn:
        units = rows_to_dicts(conn.execute("SELECT * FROM units ORDER BY sort_order").fetchall())
        skills = rows_to_dicts(conn.execute("SELECT * FROM skills ORDER BY sort_order").fetchall())
        for unit in units:
            unit["skills"] = [skill for skill in skills if skill["unit_id"] == unit["id"]]
        return units


@app.get("/lessons/by-skill")
def get_lessons_by_skill() -> dict[str, list[dict[str, Any]]]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM lessons ORDER BY sort_order").fetchall()
        result: dict[str, list[dict[str, Any]]] = {}
        for row in rows:
            lesson = dict(row)
            result.setdefault(lesson["skill_id"], []).append(lesson)
        return result


@app.get("/lessons/{lesson_id}/exercises")
def get_exercises(lesson_id: str) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM exercises WHERE lesson_id = ? ORDER BY sort_order",
            (lesson_id,),
        ).fetchall()
        exercises = rows_to_dicts(rows)
        for exercise in exercises:
            exercise["options"] = json.loads(exercise["options"]) if exercise["options"] else None
        return exercises


@app.get("/lessons/{lesson_id}/skill-id")
def get_lesson_skill_id(lesson_id: str) -> dict[str, str | None]:
    with connect() as conn:
        row = conn.execute("SELECT skill_id FROM lessons WHERE id = ?", (lesson_id,)).fetchone()
        return {"skill_id": row["skill_id"] if row else None}


@app.get("/skills/{skill_id}")
def get_skill(skill_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        return row_to_dict(conn.execute("SELECT * FROM skills WHERE id = ?", (skill_id,)).fetchone())


initialize_database()
