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
  'Du bist starker als dieser Moment.',
  'Es ist okay, nicht okay zu sein.',
  'Dieser Moment geht vorbei — du schaffst das.',
  'Du bist nicht allein mit dem was du fuhlst.',
  'Dein Atem ist immer bei dir. Komm zuruck.',
  'Du musst das nicht alleine tragen.',
  'Angst lugt manchmal. Du bist sicherer als sie dir sagt.',
  'Kleine Schritte zahlen genauso wie grobe.',
  'Du hast schon schwierige Tage uberstanden — auch diesen.',
  'Es ist keine Schwache, Hilfe zu brauchen.',
  'Dein Korper versucht dich zu schutzen — er meint es gut.',
  'Du kannst langsam sein. Das ist kein Versagen.',
  'Gib dir die Freundlichkeit, die du anderen gibst.',
  'Heute reicht "gut genug" vollkommen aus.',
  'Du darfst Grenzen haben. Du darfst Nein sagen.',
  'Dieser Gedanke ist nicht die Realitat — er ist nur ein Gedanke.',
  'Du bist mehr als deine angstlichsten Momente.',
  'Ruhe ist keine Zeitverschwendung. Sie ist Pflege.',
  'Auch wenn es sich nicht so anfuhlt — du machst das gut.',
  'Jeder Atemzug ist ein neuer Anfang.',
  'Du musst dich nicht fur deine Gefuhle rechtfertigen.',
  'Manchmal ist "ich versuche es" die mutigste Antwort.',
  'Dein Wert hangt nicht von deiner Produktivitat ab.',
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
