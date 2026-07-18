/**
 * Smart Budget private chat / special-requests guard — block phone numbers /
 * digits / number-words so parties cannot exchange contacts off-platform.
 */

const NUMBER_WORDS = [
  'zero',
  'nil',
  'nought',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
  'hundred',
  'thousand',
  'lakh',
  'crore',
  'double',
  'triple',
  'quadruple',
  // Indian romanizations (skip ambiguous shorts like do/ek/oh)
  'chaar',
  'paanch',
  'panch',
  'chhe',
  'saat',
  'aath',
];

const NUMBER_WORD_RE = new RegExp(`\\b(?:${NUMBER_WORDS.join('|')})\\b`, 'i');

/** Any Unicode decimal digit. */
const DIGIT_RE = /\p{Nd}/u;

export type SmartBudgetChatGuardResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Detect spaced-out digit words: "n i n e", "e i g h t", etc.
 */
function hasSpacedNumberWord(normalized: string): boolean {
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return false;
  // Only treat as evasion when most tokens are single letters
  const singleLetterCount = tokens.filter((t) => t.length === 1).length;
  if (singleLetterCount < tokens.length * 0.6) return false;

  const compact = tokens.join('');
  return NUMBER_WORDS.some((word) => word.length >= 3 && compact.includes(word));
}

function contactFreeTextFailure(body: string): SmartBudgetChatGuardResult | null {
  if (DIGIT_RE.test(body)) {
    return {
      ok: false,
      reason:
        'Numbers and phone digits are not allowed. Share trip details in words only — use your profile phone for contact.',
    };
  }

  // Normalize spacing / punctuation so "nine," still matches as a word
  const normalized = body
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (NUMBER_WORD_RE.test(normalized)) {
    return {
      ok: false,
      reason:
        'Number words (like one, two, nine) are not allowed — they can be used to share phone numbers.',
    };
  }

  if (hasSpacedNumberWord(normalized)) {
    return {
      ok: false,
      reason: 'Number words are not allowed.',
    };
  }

  return null;
}

/**
 * Shared contact-free text rules (digits + number-words).
 * Used by private chat and customer special requests.
 */
export function validateSmartBudgetContactFreeText(
  raw: string,
  options?: { allowEmpty?: boolean; emptyReason?: string }
): SmartBudgetChatGuardResult {
  const body = raw.trim();
  if (!body) {
    if (options?.allowEmpty) return { ok: true };
    return { ok: false, reason: options?.emptyReason || 'Message cannot be empty' };
  }

  return contactFreeTextFailure(body) ?? { ok: true };
}

export function validateSmartBudgetChatMessage(raw: string): SmartBudgetChatGuardResult {
  return validateSmartBudgetContactFreeText(raw, { allowEmpty: false });
}

/** Optional special-requests field — empty is fine; no phones / number-words. */
export function validateSmartBudgetSpecialRequests(raw: string): SmartBudgetChatGuardResult {
  return validateSmartBudgetContactFreeText(raw, { allowEmpty: true });
}
