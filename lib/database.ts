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
  type: 'breathing' | 'affirmations' | 'box_breathing' | 'grounding' | 'muscle_relaxation';
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
    await initBrainTables();
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

export async function updateJournalEntry(entry: JournalEntry): Promise<void> {
  if (!entry.id) throw new Error('Kein ID vorhanden');
  try {
    const database = getDb();
    await database.runAsync(
      'UPDATE journal_entries SET title = ?, content = ?, mood_score = ? WHERE id = ?',
      [entry.title ?? '', entry.content, entry.mood_score ?? null, entry.id]
    );
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Tagebucheintrags:', error);
    throw error;
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
    // Use local midnight to avoid UTC off-by-one on date comparisons
    const todayMs = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();

    for (let i = 0; i < rows.length; i++) {
      // Parse YYYY-MM-DD as local midnight (not UTC midnight)
      const [year, month, day] = rows[i].date.split('-').map(Number);
      const entryMs = new Date(year, month - 1, day).getTime();
      const expectedMs = todayMs - i * 86400000;

      if (entryMs === expectedMs) {
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

// ─── Gehirntraining ────────────────────────────────────────────────

export type BrainDomain = 'memory' | 'language' | 'logic' | 'reaction';

export interface BrainAttempt {
  id?: number;
  domain: BrainDomain;
  exercise_type: string;
  difficulty_level: number;
  score: number;
  correct_count: number;
  total_count: number;
  avg_response_ms?: number | null;
  xp_earned: number;
  max_combo?: number;
  is_perfect?: number;
  date: string;
  created_at?: string;
}

export interface BrainDomainProgress {
  domain: BrainDomain;
  current_level: number;
  total_xp: number;
  best_score: number;
  last_played: string | null;
}

export interface BrainBadge {
  id: string;
  unlocked_at: string;
}

export interface BrainDailyMission {
  id?: number;
  date: string;
  domain: BrainDomain;
  exercise_type: string;
  target_count: number;
  completed_count: number;
  reward_xp: number;
  completed: boolean;
}

export async function initBrainTables(): Promise<void> {
  const database = getDb();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS brain_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      difficulty_level INTEGER NOT NULL DEFAULT 1,
      score INTEGER NOT NULL DEFAULT 0,
      correct_count INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER NOT NULL DEFAULT 0,
      avg_response_ms INTEGER,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS brain_domain_progress (
      domain TEXT PRIMARY KEY NOT NULL,
      current_level INTEGER NOT NULL DEFAULT 1,
      total_xp INTEGER NOT NULL DEFAULT 0,
      best_score INTEGER NOT NULL DEFAULT 0,
      last_played TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS brain_badges (
      id TEXT PRIMARY KEY NOT NULL,
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS brain_daily_mission (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      domain TEXT NOT NULL,
      exercise_type TEXT NOT NULL,
      target_count INTEGER NOT NULL DEFAULT 1,
      completed_count INTEGER NOT NULL DEFAULT 0,
      reward_xp INTEGER NOT NULL DEFAULT 50,
      completed INTEGER NOT NULL DEFAULT 0
    );
  `);
  // Migrations: add columns if not yet present (fails silently if already exist)
  const dbMig = getDb();
  try { await dbMig.execAsync(`ALTER TABLE brain_attempts ADD COLUMN max_combo INTEGER DEFAULT 0`); } catch {}
  try { await dbMig.execAsync(`ALTER TABLE brain_attempts ADD COLUMN is_perfect INTEGER DEFAULT 0`); } catch {}
}

export async function insertBrainAttempt(attempt: BrainAttempt): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      `INSERT INTO brain_attempts (domain, exercise_type, difficulty_level, score, correct_count, total_count, avg_response_ms, xp_earned, max_combo, is_perfect, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [attempt.domain, attempt.exercise_type, attempt.difficulty_level, attempt.score,
       attempt.correct_count, attempt.total_count, attempt.avg_response_ms ?? null,
       attempt.xp_earned, attempt.max_combo ?? 0, attempt.is_perfect ?? 0, attempt.date]
    );
  } catch (error) {
    console.error('Fehler beim Speichern des Brain-Attempts:', error);
    throw error;
  }
}

export async function getBrainAttempts(domain?: BrainDomain, limit = 50): Promise<BrainAttempt[]> {
  try {
    const database = getDb();
    if (domain) {
      return await database.getAllAsync<BrainAttempt>(
        'SELECT * FROM brain_attempts WHERE domain = ? ORDER BY created_at DESC LIMIT ?',
        [domain, limit]
      );
    }
    return await database.getAllAsync<BrainAttempt>(
      'SELECT * FROM brain_attempts ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  } catch (error) {
    console.error('Fehler beim Laden der Brain-Attempts:', error);
    return [];
  }
}

export async function getDomainProgress(domain: BrainDomain): Promise<BrainDomainProgress> {
  try {
    const database = getDb();
    const row = await database.getFirstAsync<BrainDomainProgress>(
      'SELECT * FROM brain_domain_progress WHERE domain = ?',
      [domain]
    );
    return row ?? { domain, current_level: 1, total_xp: 0, best_score: 0, last_played: null };
  } catch (error) {
    console.error('Fehler beim Laden des Domain-Fortschritts:', error);
    return { domain, current_level: 1, total_xp: 0, best_score: 0, last_played: null };
  }
}

export async function getDomainLevel(domain: BrainDomain): Promise<number> {
  const progress = await getDomainProgress(domain);
  return progress.current_level;
}

export async function setDomainProgress(
  domain: BrainDomain,
  level: number,
  xpToAdd: number,
  score: number
): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      `INSERT INTO brain_domain_progress (domain, current_level, total_xp, best_score, last_played, updated_at)
       VALUES (?, ?, ?, ?, date('now'), datetime('now'))
       ON CONFLICT(domain) DO UPDATE SET
         current_level = excluded.current_level,
         total_xp = total_xp + ?,
         best_score = MAX(best_score, excluded.best_score),
         last_played = excluded.last_played,
         updated_at = excluded.updated_at`,
      [domain, level, xpToAdd, score, xpToAdd]
    );
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Domain-Fortschritts:', error);
    throw error;
  }
}

export async function getXP(): Promise<number> {
  try {
    const database = getDb();
    const row = await database.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(total_xp), 0) as total FROM brain_domain_progress'
    );
    return row?.total ?? 0;
  } catch (error) {
    return 0;
  }
}

export async function getBrainStreak(): Promise<number> {
  try {
    const database = getDb();
    const rows = await database.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM brain_attempts ORDER BY date DESC'
    );
    if (rows.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    for (let i = 0; i < rows.length; i++) {
      const [year, month, day] = rows[i].date.split('-').map(Number);
      const entryMs = new Date(year, month - 1, day).getTime();
      if (entryMs === todayMs - i * 86400000) streak++;
      else break;
    }
    return streak;
  } catch (error) {
    return 0;
  }
}

export async function getBadges(): Promise<BrainBadge[]> {
  try {
    const database = getDb();
    return await database.getAllAsync<BrainBadge>('SELECT * FROM brain_badges ORDER BY unlocked_at DESC');
  } catch (error) {
    return [];
  }
}

export async function unlockBadge(badgeId: string): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      'INSERT INTO brain_badges (id) VALUES (?) ON CONFLICT(id) DO NOTHING',
      [badgeId]
    );
  } catch (error) {
    console.error('Fehler beim Freischalten des Badges:', error);
  }
}

export async function getDailyMission(date: string): Promise<BrainDailyMission | null> {
  try {
    const database = getDb();
    const row = await database.getFirstAsync<{
      id: number; date: string; domain: string; exercise_type: string;
      target_count: number; completed_count: number; reward_xp: number; completed: number;
    }>('SELECT * FROM brain_daily_mission WHERE date = ?', [date]);
    if (!row) return null;
    return { ...row, domain: row.domain as BrainDomain, completed: row.completed === 1 };
  } catch (error) {
    return null;
  }
}

export async function saveDailyMission(mission: Omit<BrainDailyMission, 'id'>): Promise<void> {
  try {
    const database = getDb();
    await database.runAsync(
      `INSERT INTO brain_daily_mission (date, domain, exercise_type, target_count, completed_count, reward_xp, completed)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO NOTHING`,
      [mission.date, mission.domain, mission.exercise_type, mission.target_count,
       mission.completed_count, mission.reward_xp, mission.completed ? 1 : 0]
    );
  } catch (error) {
    console.error('Fehler beim Speichern der Tages-Mission:', error);
  }
}

export async function incrementMissionProgress(date: string): Promise<BrainDailyMission | null> {
  try {
    const database = getDb();
    await database.runAsync(
      `UPDATE brain_daily_mission
       SET completed_count = completed_count + 1,
           completed = CASE WHEN completed_count + 1 >= target_count THEN 1 ELSE 0 END
       WHERE date = ? AND completed = 0`,
      [date]
    );
    return getDailyMission(date);
  } catch (error) {
    return null;
  }
}

export async function getPersonalBest(
  domain: BrainDomain,
  exerciseType: string
): Promise<{ bestAccuracy: number } | null> {
  try {
    const database = getDb();
    const row = await database.getFirstAsync<{ best_accuracy: number | null }>(
      `SELECT MAX(CAST(correct_count AS REAL) / NULLIF(total_count, 0)) as best_accuracy
       FROM brain_attempts WHERE domain = ? AND exercise_type = ? AND total_count > 0`,
      [domain, exerciseType]
    );
    if (!row || row.best_accuracy === null) return null;
    return { bestAccuracy: row.best_accuracy };
  } catch (error) {
    return null;
  }
}

export async function getWeeklyBrainStats(): Promise<{
  avgAccuracy: number | null;
  avgResponseMs: number | null;
  totalSessions: number;
}> {
  try {
    const database = getDb();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const row = await database.getFirstAsync<{
      avgAcc: number | null; avgMs: number | null; total: number;
    }>(
      `SELECT
        AVG(CASE WHEN total_count > 0 THEN CAST(correct_count AS REAL) / total_count ELSE NULL END) as avgAcc,
        AVG(avg_response_ms) as avgMs,
        COUNT(*) as total
       FROM brain_attempts WHERE date >= ?`,
      [cutoffStr]
    );
    return {
      avgAccuracy: row?.avgAcc != null ? Math.round(row.avgAcc * 100) : null,
      avgResponseMs: row?.avgMs != null ? Math.round(row.avgMs) : null,
      totalSessions: row?.total ?? 0,
    };
  } catch (error) {
    return { avgAccuracy: null, avgResponseMs: null, totalSessions: 0 };
  }
}
