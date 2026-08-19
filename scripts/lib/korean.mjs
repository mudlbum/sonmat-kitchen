// Korean particle (josa) selection.
//
// Why this file exists: hard-coding a particle after a variable is the single
// most visible sign that Korean text was assembled by a program. `${재료}이`
// renders 돼지고기이 / 두부이, which no Korean writer would ever produce.
//
// RULE FOR THIS REPO: any Korean template string that puts a particle after an
// interpolated value MUST go through josa(). No exceptions.

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

// Sino-Korean readings of digits, and whether that reading ends in a 받침.
// 0 영, 1 일(ㄹ), 2 이, 3 삼(ㅁ), 4 사, 5 오, 6 육(ㄱ), 7 칠(ㄹ), 8 팔(ㄹ), 9 구
const DIGIT_JONG = { '0': 0, '1': 8, '2': 0, '3': 16, '4': 0, '5': 0, '6': 1, '7': 8, '8': 8, '9': 0 };

// Korean readings of Latin letter names, for tokens like "MSG" (엠에스지) or
// "L" (엘). Only the final letter matters.
const LATIN_JONG = {
  a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0, h: 0, i: 0, j: 0,
  k: 0, l: 8, m: 16, n: 4, o: 0, p: 0, q: 0, r: 8, s: 0, t: 0,
  u: 0, v: 0, w: 0, x: 0, y: 0, z: 0,
};

/**
 * Final-consonant (종성) index of the last meaningful character of `word`.
 * Returns 0 when there is no 받침. Returns -1 when it cannot be determined.
 * Index 8 is ㄹ, which several particles treat as a special case.
 */
export function finalJong(word) {
  if (!word) return -1;
  // Ignore trailing punctuation, brackets and whitespace.
  const cleaned = String(word).replace(/[\s.,!?)\]}"'’”·…]+$/u, '');
  if (!cleaned) return -1;
  const ch = cleaned[cleaned.length - 1];
  const code = ch.codePointAt(0);

  if (code >= HANGUL_START && code <= HANGUL_END) {
    return (code - HANGUL_START) % 28;
  }
  if (ch >= '0' && ch <= '9') return DIGIT_JONG[ch];
  const lower = ch.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(LATIN_JONG, lower)) return LATIN_JONG[lower];
  return -1;
}

const PAIRS = {
  '은': ['는', '은'], '는': ['는', '은'],
  '이': ['가', '이'], '가': ['가', '이'],
  '을': ['를', '을'], '를': ['를', '을'],
  '와': ['와', '과'], '과': ['와', '과'],
  '로': ['로', '으로'], '으로': ['로', '으로'],
  '아': ['야', '아'], '야': ['야', '아'],
  '이라': ['라', '이라'], '라': ['라', '이라'],
};

/**
 * Pick the correct particle for `word`.
 *   josa('두부', '을')   -> '를'
 *   josa('돼지고기', '이') -> '가'
 *   josa('간장', '으로')  -> '으로'
 *   josa('마늘', '으로')  -> '로'   (ㄹ exception)
 *
 * When the ending cannot be determined (emoji, CJK ideograph, symbol), the
 * with-받침 form is returned — it is the safer of the two to read.
 */
export function josa(word, particle) {
  const pair = PAIRS[particle];
  if (!pair) throw new Error(`josa(): unsupported particle "${particle}"`);
  const [withoutBatchim, withBatchim] = pair;
  const jong = finalJong(word);

  // 으로/로 takes the no-받침 form after ㄹ as well.
  if ((particle === '로' || particle === '으로') && jong === 8) return withoutBatchim;

  if (jong === 0) return withoutBatchim;
  if (jong === -1) return withBatchim;
  return withBatchim;
}

/** Convenience: word + its particle, e.g. wj('두부', '을') -> '두부를' */
export function wj(word, particle) {
  return `${word}${josa(word, particle)}`;
}
