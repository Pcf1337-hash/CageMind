import { BrainDomain } from './database';

export type { BrainDomain };

export interface BrainAttemptInput {
  domain: BrainDomain;
  exerciseType: string;
  difficultyLevel: number;
  score: number;
  correctCount: number;
  totalCount: number;
  avgResponseMs?: number;
  xpEarned: number;
  date: string;
}

export interface DailyMission {
  date: string;
  domain: BrainDomain;
  exerciseType: string;
  targetCount: number;
  completedCount: number;
  rewardXP: number;
  completed: boolean;
}

export interface Badge {
  id: string;
  label: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

// ─── Ziel-Reaktionszeiten pro Domain (ms) ─────────────────────────
const DOMAIN_TARGET_MS: Record<BrainDomain, number> = {
  memory:   3000,
  language: 8000,
  logic:    10000,
  reaction: 600,
};

// ─── Adaptive Schwierigkeit ────────────────────────────────────────
export function calculateNextLevel(
  currentLevel: number,
  correctCount: number,
  totalCount: number,
  avgResponseMs: number,
  domain: BrainDomain
): number {
  if (totalCount === 0) return currentLevel;
  const accuracy = correctCount / totalCount;
  const targetMs = DOMAIN_TARGET_MS[domain];
  if (accuracy > 0.80 && avgResponseMs < targetMs) {
    return Math.min(10, currentLevel + 1);
  } else if (accuracy < 0.50) {
    return Math.max(1, currentLevel - 1);
  }
  return currentLevel;
}

// ─── XP-Berechnung ────────────────────────────────────────────────
export function calculateXP(
  correctCount: number,
  totalCount: number,
  difficultyLevel: number,
  isMissionCompleted: boolean
): number {
  const base = correctCount * 5;
  const levelBonus = difficultyLevel * 3;
  const missionBonus = isMissionCompleted ? 50 : 0;
  return Math.round(base + levelBonus + missionBonus);
}

// ─── Level-System ─────────────────────────────────────────────────
export function xpToLevel(totalXP: number): {
  level: number;
  progress: number;
  nextLevelXP: number;
} {
  let level = 1;
  let xpNeeded = 100;
  let accumulated = 0;
  while (accumulated + xpNeeded <= totalXP) {
    accumulated += xpNeeded;
    level++;
    xpNeeded = 100 * level;
  }
  return {
    level,
    progress: totalXP - accumulated,
    nextLevelXP: xpNeeded,
  };
}

// ─── Tages-Mission Generator ───────────────────────────────────────
const DOMAIN_ORDER: BrainDomain[] = ['memory', 'language', 'logic', 'reaction'];
const MISSION_EXERCISES: Record<BrainDomain, string[]> = {
  memory:   ['memory_cards', 'nback'],
  language: ['anagram', 'wordchain'],
  logic:    ['number_sequence', 'math_sprint'],
  reaction: ['tap_target', 'stroop'],
};

export function generateDailyMission(date: string): Omit<DailyMission, 'completedCount' | 'completed'> {
  // Deterministic from date: sum of char codes mod domain count
  const dayIndex = date.split('-').reduce((sum, part) => sum + parseInt(part, 10), 0);
  const domain = DOMAIN_ORDER[dayIndex % 4];
  const exercises = MISSION_EXERCISES[domain];
  const exerciseType = exercises[dayIndex % exercises.length];
  // Mon=2, Tue=2, Wed=3, Thu=3, Fri=3, Sat=2, Sun=2
  const dow = new Date(date).getDay();
  const targetCount = dow >= 2 && dow <= 5 ? 3 : 2;
  return {
    date,
    domain,
    exerciseType,
    targetCount,
    rewardXP: 50,
  };
}

// ─── Badge-Definitionen ────────────────────────────────────────────
export const BRAIN_BADGES: Badge[] = [
  { id: 'first_memory',     label: 'Erstes Memory',      icon: '🃏', description: 'Erste Gedächtnis-Übung abgeschlossen' },
  { id: 'first_language',   label: 'Erste Worte',        icon: '🔤', description: 'Erste Sprach-Übung abgeschlossen' },
  { id: 'first_logic',      label: 'Erster Denker',      icon: '🔢', description: 'Erste Logik-Übung abgeschlossen' },
  { id: 'first_reaction',   label: 'Erster Blitz',       icon: '⚡', description: 'Erste Reaktions-Übung abgeschlossen' },
  { id: 'all_domains',      label: 'Allrounder',         icon: '🌟', description: 'Alle 4 Domains gespielt' },
  { id: 'streak_3',         label: '3 Tage Streak',      icon: '🔥', description: '3 Tage in Folge trainiert' },
  { id: 'streak_7',         label: '7 Tage Streak',      icon: '🔥', description: '7 Tage in Folge trainiert' },
  { id: 'streak_30',        label: 'Monats-Krieger',     icon: '💎', description: '30 Tage in Folge trainiert' },
  { id: 'level_5_memory',   label: 'Gedächtnis-Profi',   icon: '🧠', description: 'Level 5 in Gedächtnis erreicht' },
  { id: 'level_5_logic',    label: 'Logik-Meister',      icon: '🎯', description: 'Level 5 in Logik erreicht' },
  { id: 'level_5_reaction', label: 'Reflex-Champion',    icon: '🏆', description: 'Level 5 in Reaktion erreicht' },
  { id: 'xp_500',           label: 'Aufsteiger',         icon: '⭐', description: '500 XP gesammelt' },
  { id: 'xp_2000',          label: 'Erfahrener',         icon: '🌙', description: '2000 XP gesammelt' },
  { id: 'accuracy_90',      label: 'Perfektionist',      icon: '✨', description: '90% Genauigkeit in einer Runde' },
  { id: 'speed_demon',      label: 'Speed-Demon',        icon: '💨', description: 'Reaktion unter 400ms' },
];

// ─── Badge-Checker ─────────────────────────────────────────────────
export function checkBadgeUnlocks(
  attempt: BrainAttemptInput,
  stats: {
    totalAttempts: number;
    streak: number;
    domainLevels: Record<BrainDomain, number>;
    totalXP: number;
    unlockedBadgeIds: string[];
    playedDomains: Set<BrainDomain>;
  }
): string[] {
  const toUnlock: string[] = [];
  const has = (id: string) => stats.unlockedBadgeIds.includes(id);

  // First play badges
  if (!has('first_' + attempt.domain)) toUnlock.push('first_' + attempt.domain);

  // All domains
  if (!has('all_domains') && stats.playedDomains.size === 4) {
    toUnlock.push('all_domains');
  }

  // Streak
  if (!has('streak_3') && stats.streak >= 3) toUnlock.push('streak_3');
  if (!has('streak_7') && stats.streak >= 7) toUnlock.push('streak_7');
  if (!has('streak_30') && stats.streak >= 30) toUnlock.push('streak_30');

  // Domain levels
  const dl = stats.domainLevels;
  if (!has('level_5_memory') && (dl.memory ?? 0) >= 5) toUnlock.push('level_5_memory');
  if (!has('level_5_logic') && (dl.logic ?? 0) >= 5) toUnlock.push('level_5_logic');
  if (!has('level_5_reaction') && (dl.reaction ?? 0) >= 5) toUnlock.push('level_5_reaction');

  // XP
  if (!has('xp_500') && stats.totalXP >= 500) toUnlock.push('xp_500');
  if (!has('xp_2000') && stats.totalXP >= 2000) toUnlock.push('xp_2000');

  // Per-attempt
  const accuracy = attempt.totalCount > 0 ? attempt.correctCount / attempt.totalCount : 0;
  if (!has('accuracy_90') && accuracy >= 0.9) toUnlock.push('accuracy_90');
  if (!has('speed_demon') && attempt.domain === 'reaction' && (attempt.avgResponseMs ?? 9999) < 400) {
    toUnlock.push('speed_demon');
  }

  return toUnlock;
}

// ─── Domain-Metadaten ──────────────────────────────────────────────
export const DOMAIN_META: Record<BrainDomain, { label: string; icon: string; color: string; description: string }> = {
  memory:   { label: 'Gedächtnis',  icon: '🃏', color: '#A78BFA', description: 'Memory-Karten & N-Back' },
  language: { label: 'Sprache',     icon: '🔤', color: '#86EFAC', description: 'Anagramm & Wort-Kette' },
  logic:    { label: 'Logik',       icon: '🔢', color: '#FCD34D', description: 'Zahlenreihen & Mathe-Sprint' },
  reaction: { label: 'Reaktion',    icon: '⚡', color: '#F87171', description: 'Tap-Targets & Stroop-Test' },
};

// ─── Anagramm-Wortliste (200+ deutsche Wörter) ─────────────────────
export const ANAGRAM_WORDS: string[] = [
  // 4 Buchstaben
  'BAUM', 'TIER', 'HAUS', 'GRAS', 'WELT', 'MOND', 'LIED', 'BUCH', 'HERZ', 'MEER',
  'HOLZ', 'FELD', 'BERG', 'DORF', 'WALD', 'BLUT', 'GOTT', 'KIND', 'HAND', 'KOPF',
  // 5 Buchstaben
  'BLUME', 'STERN', 'NACHT', 'LIEBE', 'ANGST', 'KRAFT', 'TRAUM', 'MUSIK', 'FARBE', 'WASSER',
  'FEUER', 'HIMMEL', 'STURM', 'BRÜCKE', 'SCHLAF', 'FRIEDEN', 'GARTEN', 'VOGEL', 'FISCH', 'WOLKE',
  // 6 Buchstaben
  'FREUDE', 'DONNER', 'SPIEGEL', 'FENSTER', 'STRASSE', 'BRÜCKE', 'SCHULE', 'KÜSTE', 'STIMME', 'NARBEN',
  // 7 Buchstaben
  'FREIHEIT', 'WAHRHEIT', 'GEDANKE', 'MORGEN', 'ABEND', 'TRÄNEN', 'RUHE', 'STILLE', 'HOFFNUNG', 'GEDULD',
];

// ─── Zahlenreihen für Logik-Übungen ───────────────────────────────
export interface NumberSequence {
  sequence: (number | null)[];  // null = gesuchte Zahl
  answer: number;
  level: number;
}

export function generateNumberSequence(level: number): NumberSequence {
  const sequences: NumberSequence[] = [
    // Level 1: Einfache Addition
    { sequence: [2, 4, 6, null, 10], answer: 8, level: 1 },
    { sequence: [5, 10, 15, null, 25], answer: 20, level: 1 },
    { sequence: [1, 3, 5, 7, null], answer: 9, level: 1 },
    { sequence: [10, 20, null, 40, 50], answer: 30, level: 1 },
    // Level 2: Multiplikation
    { sequence: [2, 4, 8, null, 32], answer: 16, level: 2 },
    { sequence: [3, 6, 12, null, 48], answer: 24, level: 2 },
    { sequence: [1, 2, 4, 8, null], answer: 16, level: 2 },
    // Level 3: Gemischt
    { sequence: [1, 3, 7, 15, null], answer: 31, level: 3 },
    { sequence: [2, 5, 10, 17, null], answer: 26, level: 3 },
    { sequence: [100, 50, null, 12, 6], answer: 25, level: 3 },
    // Level 4+: Fibonacci & Quadrate
    { sequence: [1, 1, 2, 3, null, 8], answer: 5, level: 4 },
    { sequence: [4, 9, 16, null, 36], answer: 25, level: 4 },
    { sequence: [1, 4, 9, 16, null], answer: 25, level: 4 },
  ];
  const available = sequences.filter(s => s.level <= Math.min(level, 4));
  return available[Math.floor(Math.random() * available.length)];
}

export function generateWrongAnswers(correct: number): number[] {
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const offset = Math.floor(Math.random() * 10) + 1;
    const candidate = Math.random() < 0.5 ? correct + offset : correct - offset;
    if (candidate !== correct) wrongs.add(candidate);
  }
  return Array.from(wrongs);
}

// ─── Stroop-Test Farben ────────────────────────────────────────────
export const STROOP_COLORS = [
  { name: 'ROT',    hex: '#F87171' },
  { name: 'BLAU',   hex: '#60A5FA' },
  { name: 'GRÜN',   hex: '#86EFAC' },
  { name: 'GELB',   hex: '#FCD34D' },
];

export interface StroopRound {
  word: string;      // Das angezeigte Wort
  wordColor: string; // Die Farbe in der das Wort angezeigt wird (hex)
  answer: string;    // Der korrekte Farbname (der Hex-Farbe)
}

export function generateStroopRound(): StroopRound {
  const wordIdx = Math.floor(Math.random() * STROOP_COLORS.length);
  let colorIdx = Math.floor(Math.random() * STROOP_COLORS.length);
  // 50% chance of congruent (word matches color)
  if (Math.random() < 0.5) colorIdx = wordIdx;
  return {
    word: STROOP_COLORS[wordIdx].name,
    wordColor: STROOP_COLORS[colorIdx].hex,
    answer: STROOP_COLORS[colorIdx].name,
  };
}
