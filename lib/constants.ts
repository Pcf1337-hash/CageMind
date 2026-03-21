export const COLORS = {
  bg: '#12111A',
  surface: '#1C1B28',
  surface2: '#252436',
  accent: '#A78BFA',
  accent2: '#86EFAC',
  warm: '#FCD34D',
  text: '#F1F0FA',
  muted: '#7B7A96',
  danger: '#F87171',
} as const;

export const AFFIRMATIONS = [
  'Du bist stärker als dieser Moment.',
  'Es ist okay, nicht okay zu sein.',
  'Dieser Moment geht vorbei — du schaffst das.',
  'Du bist nicht allein mit dem was du fühlst.',
  'Dein Atem ist immer bei dir. Komm zurück.',
  'Du musst das nicht alleine tragen.',
  'Angst lügt manchmal. Du bist sicherer als sie dir sagt.',
  'Kleine Schritte zählen genauso wie große.',
  'Du hast schon schwierige Tage überstanden — auch diesen.',
  'Es ist keine Schwäche, Hilfe zu brauchen.',
  'Dein Körper versucht dich zu schützen — er meint es gut.',
  'Du kannst langsam sein. Das ist kein Versagen.',
  'Gib dir die Freundlichkeit, die du anderen gibst.',
  'Heute reicht "gut genug" vollkommen aus.',
  'Du darfst Grenzen haben. Du darfst Nein sagen.',
  'Dieser Gedanke ist nicht die Realität — er ist nur ein Gedanke.',
  'Du bist mehr als deine ängstlichsten Momente.',
  'Ruhe ist keine Zeitverschwendung. Sie ist Pflege.',
  'Auch wenn es sich nicht so anfühlt — du machst das gut.',
  'Jeder Atemzug ist ein neuer Anfang.',
  'Du musst dich nicht für deine Gefühle rechtfertigen.',
  'Manchmal ist "ich versuche es" die mutigste Antwort.',
  'Dein Wert hängt nicht von deiner Produktivität ab.',
] as const;

export const MOOD_EMOJIS: Record<number, string> = {
  1: '😰',
  2: '😟',
  3: '😐',
  4: '🙂',
  5: '😊',
};

export const MOOD_LABELS: Record<number, string> = {
  1: 'Sehr schlecht',
  2: 'Nicht gut',
  3: 'Geht so',
  4: 'Gut',
  5: 'Super',
};

export const GREETINGS = {
  morning: 'Guten Morgen',
  noon: 'Guten Mittag',
  evening: 'Guten Abend',
  night: 'Gute Nacht',
} as const;

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return GREETINGS.morning;
  if (hour >= 11 && hour < 17) return GREETINGS.noon;
  if (hour >= 17 && hour < 22) return GREETINGS.evening;
  return GREETINGS.night;
}

/**
 * Returns today's date as YYYY-MM-DD using the device's local timezone.
 * Avoids the UTC off-by-one issue of new Date().toISOString().split('T')[0].
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses a YYYY-MM-DD string as a local date (not UTC).
 * Avoids the off-by-one shift from new Date('YYYY-MM-DD') which is UTC midnight.
 */
export function parseLocalDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

export function getDailyAffirmation(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000
  );
  return AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length];
}

export const CRISIS_PHONE = '0800 111 0 111';
export const CRISIS_PHONE_ALT = '0800 111 0 222';

export const BREATHING_PHASES = [
  { label: 'Einatmen', duration: 4, color: '#A78BFA' },
  { label: 'Halten', duration: 7, color: '#86EFAC' },
  { label: 'Ausatmen', duration: 8, color: '#FCD34D' },
] as const;

export const BREATHING_ROUNDS = 3;

export const BOX_BREATHING_PHASES = [
  { label: 'Einatmen', duration: 4, color: '#A78BFA' },
  { label: 'Halten', duration: 4, color: '#86EFAC' },
  { label: 'Ausatmen', duration: 4, color: '#FCD34D' },
  { label: 'Halten', duration: 4, color: '#86EFAC' },
] as const;

export const BOX_BREATHING_ROUNDS = 4;

export const GROUNDING_STEPS = [
  {
    count: 5,
    sense: 'SIEHST',
    emoji: '👀',
    instruction: 'Schau dich um. Nenn 5 Dinge die du siehst — auch ganz alltägliche.',
  },
  {
    count: 4,
    sense: 'HÖRST',
    emoji: '👂',
    instruction: 'Bleib still. Nenn 4 Geräusche die du gerade hörst.',
  },
  {
    count: 3,
    sense: 'FÜHLST',
    emoji: '🤲',
    instruction: 'Spür nach. Nenn 3 Dinge die du körperlich fühlst — Kleidung, Stuhl, Boden.',
  },
  {
    count: 2,
    sense: 'RIECHST',
    emoji: '👃',
    instruction: 'Atme tief durch die Nase. Nenn 2 Gerüche die du wahrnimmst.',
  },
  {
    count: 1,
    sense: 'SCHMECKST',
    emoji: '👅',
    instruction: 'Nenn 1 Geschmack den du im Mund wahrnimmst.',
  },
] as const;

export const MUSCLE_GROUPS = [
  { name: 'Hände', instruction: 'Balle deine Hände zur Faust', emoji: '✊' },
  { name: 'Arme', instruction: 'Strecke die Arme und spanne die Muskeln fest an', emoji: '💪' },
  { name: 'Schultern', instruction: 'Ziehe die Schultern fest zu den Ohren hoch', emoji: '🧍' },
  { name: 'Gesicht', instruction: 'Kneif die Augen zu und runzle die Stirn', emoji: '😬' },
  { name: 'Bauch', instruction: 'Spanne deinen Bauch fest an wie bei einem Schlag', emoji: '🫁' },
  { name: 'Oberschenkel', instruction: 'Presse deine Oberschenkel zusammen', emoji: '🦵' },
  { name: 'Füße', instruction: 'Ziehe deine Zehen fest nach oben Richtung Schienbein', emoji: '🦶' },
] as const;
