import * as SQLite from 'expo-sqlite';

export interface MoodEntry {
  id?: number;
  date: string;
  mood_score: number;
  emoji: string;
  note: string;
  created_at?: string;
}

export interface JournalEntry {
  id?: number;
  title: string;
  content: string;
  mood_score: number | null;
  date: string;
  created_at?: string;
}

export interface ExerciseSession {
  id?: number;
  type: 'breathing' | 'affirmations';
  duration_seconds: number;
  completed: boolean;
  date: string;
  created_at?: string;
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Datenbank nicht initialisiert. Bitte zuerst initDatabase() aufrufen.');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync('cagemind.db');

    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS mood_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        mood_score INTEGER NOT NULL CHECK(mood_score BETWEEN 1 AND 5),
        emoji TEXT NOT NULL,
        note TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS journal_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT DEFAULT '',
        content TEXT NOT NULL,
        mood_score INTEGER CHECK(mood_score BETWEEN 1 AND 5),
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS exercise_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
  } catch (error) {
    console.error('Datenbankinitialisierung fehlgeschlagen:', error);
    throw error;
  }
}

// --- Mood ---

export async function insertMoodEntry(entry: MoodEntry): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      'INSERT INTO mood_entries (date, mood_score, emoji, note) VALUES (?, ?, ?, ?)',
      [entry.date, entry.mood_score, entry.emoji, entry.note ?? '']
    );
  } catch (error) {
    console.error('Fehler beim Speichern der Stimmung:', error);
    throw error;
  }
}

export async function getMoodEntries(limit = 100): Promise<MoodEntry[]> {
  try {
    const database = getDb();
    const rows = await database.getAllAsync<MoodEntry>(
      'SELECT * FROM mood_entries ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return rows;
  } catch (error) {
    console.error('Fehler beim Laden der Stimmungseintrager:', error);
    return [];
  }
}

export async function getMoodEntriesByDateRange(
  from: string,
  to: string
): Promise<MoodEntry[]> {
  try {
    const database = getDb();
    const rows = await database.getAllAsync<MoodEntry>(
      'SELECT * FROM mood_entries WHERE date >= ? AND date <= ? ORDER BY date ASC',
      [from, to]
    );
    return rows;
  } catch (error) {
    console.error('Fehler beim Laden der Stimmungseintrager:', error);
    return [];
  }
}

// --- Journal ---

export async function insertJournalEntry(entry: JournalEntry): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      'INSERT INTO journal_entries (title, content, mood_score, date) VALUES (?, ?, ?, ?)',
      [entry.title ?? '', entry.content, entry.mood_score ?? null, entry.date]
    );
  } catch (error) {
    console.error('Fehler beim Speichern des Tagebucheintrags:', error);
    throw error;
  }
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  try {
    const database = getDb();
    const rows = await database.getAllAsync<JournalEntry>(
      'SELECT * FROM journal_entries ORDER BY created_at DESC'
    );
    return rows;
  } catch (error) {
    console.error('Fehler beim Laden der Tagebucheintrager:', error);
    return [];
  }
}

export async function getJournalEntry(id: number): Promise<JournalEntry | null> {
  try {
    const database = getDb();
    const row = await database.getFirstAsync<JournalEntry>(
      'SELECT * FROM journal_entries WHERE id = ?',
      [id]
    );
    return row ?? null;
  } catch (error) {
    console.error('Fehler beim Laden des Tagebucheintrags:', error);
    return null;
  }
}

export async function deleteJournalEntry(id: number): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync('DELETE FROM journal_entries WHERE id = ?', [id]);
  } catch (error) {
    console.error('Fehler beim Loschen des Tagebucheintrags:', error);
    throw error;
  }
}

// --- Exercises ---

export async function insertExerciseSession(session: ExerciseSession): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      'INSERT INTO exercise_sessions (type, duration_seconds, completed, date) VALUES (?, ?, ?, ?)',
      [session.type, session.duration_seconds, session.completed ? 1 : 0, session.date]
    );
  } catch (error) {
    console.error('Fehler beim Speichern der Ubungssitzung:', error);
    throw error;
  }
}

export async function getExerciseSessions(): Promise<ExerciseSession[]> {
  try {
    const database = getDb();
    const rows = await database.getAllAsync<{
      id: number;
      type: string;
      duration_seconds: number;
      completed: number;
      date: string;
      created_at: string;
    }>('SELECT * FROM exercise_sessions ORDER BY created_at DESC');
    return rows.map((r) => ({
      ...r,
      type: r.type as 'breathing' | 'affirmations',
      completed: r.completed === 1,
    }));
  } catch (error) {
    console.error('Fehler beim Laden der Ubungssitzungen:', error);
    return [];
  }
}

export async function getMostFrequentExercise(): Promise<string | null> {
  try {
    const database = getDb();
    const row = await database.getFirstAsync<{ type: string }>(
      'SELECT type, COUNT(*) as count FROM exercise_sessions GROUP BY type ORDER BY count DESC LIMIT 1'
    );
    return row?.type ?? null;
  } catch (error) {
    console.error('Fehler beim Laden der haufigsten Ubung:', error);
    return null;
  }
}

// --- Chat ---

export async function insertChatMessage(msg: ChatMessage): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      'INSERT INTO chat_messages (role, content) VALUES (?, ?)',
      [msg.role, msg.content]
    );
  } catch (error) {
    console.error('Fehler beim Speichern der Chat-Nachricht:', error);
    throw error;
  }
}

export async function getChatMessages(limit = 50): Promise<ChatMessage[]> {
  try {
    const database = getDb();
    const rows = await database.getAllAsync<ChatMessage>(
      'SELECT * FROM chat_messages ORDER BY created_at ASC LIMIT ?',
      [limit]
    );
    return rows;
  } catch (error) {
    console.error('Fehler beim Laden der Chat-Nachrichten:', error);
    return [];
  }
}

export async function clearChatMessages(): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync('DELETE FROM chat_messages');
  } catch (error) {
    console.error('Fehler beim Loschen der Chat-Nachrichten:', error);
    throw error;
  }
}

// --- Settings ---

export async function getSetting(key: string): Promise<string | null> {
  try {
    const database = getDb();
    const row = await database.getFirstAsync<{ value: string }>(
      'SELECT value FROM user_settings WHERE key = ?',
      [key]
    );
    return row?.value ?? null;
  } catch (error) {
    console.error(`Fehler beim Laden von Einstellung "${key}":`, error);
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      'INSERT INTO user_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value]
    );
  } catch (error) {
    console.error(`Fehler beim Speichern von Einstellung "${key}":`, error);
    throw error;
  }
}

// --- Streak ---

export async function getStreak(): Promise<number> {
  try {
    const database = getDb();
    const rows = await database.getAllAsync<{ date: string }>(
      `SELECT DISTINCT date(date) as date FROM (
        SELECT date FROM mood_entries
        UNION
        SELECT date FROM journal_entries
        UNION
        SELECT date FROM exercise_sessions
      ) ORDER BY date DESC`
    );

    if (rows.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < rows.length; i++) {
      const entryDate = new Date(rows[i].date);
      entryDate.setHours(0, 0, 0, 0);
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      expected.setHours(0, 0, 0, 0);

      if (entryDate.getTime() === expected.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Fehler beim Berechnen des Streaks:', error);
    return 0;
  }
}

export async function clearAllData(): Promise<void> {
  try {
    const database = getDb();
    await database.execAsync(`
      DELETE FROM mood_entries;
      DELETE FROM journal_entries;
      DELETE FROM exercise_sessions;
      DELETE FROM chat_messages;
      DELETE FROM user_settings;
    `);
  } catch (error) {
    console.error('Fehler beim Loschen aller Daten:', error);
    throw error;
  }
}
