import type { FsrsCardState, Sm2CardState } from "./types.js";

// SM-2 ease factors conventionally range from 1.3 (struggling card) up to
// around 3.0+ (very easy card). We use this range as the anchor for mapping
// onto FSRS's 1-10 difficulty scale. Neither bound is a hard limit in every
// SM-2 implementation, so values outside it are clamped rather than rejected.
const SM2_MIN_EASE = 1.3;
const SM2_MAX_EASE = 3.0;
const FSRS_MIN_DIFFICULTY = 1;
const FSRS_MAX_DIFFICULTY = 10;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseIsoDate(date: string): number {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(timestamp)) {
    throw new RangeError(`invalid ISO date: ${date}`);
  }
  return timestamp;
}

function formatIsoDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  return formatIsoDate(parseIsoDate(date) + Math.round(days) * MS_PER_DAY);
}

// Maps an SM-2 ease factor onto FSRS difficulty. The two scales run in
// opposite directions: a high ease factor means an easy card (low
// difficulty), so this is an inverse linear interpolation.
function easeToDifficulty(easeFactor: number): number {
  const clampedEase = clamp(easeFactor, SM2_MIN_EASE, SM2_MAX_EASE);
  const fraction = (clampedEase - SM2_MIN_EASE) / (SM2_MAX_EASE - SM2_MIN_EASE);
  return FSRS_MAX_DIFFICULTY - fraction * (FSRS_MAX_DIFFICULTY - FSRS_MIN_DIFFICULTY);
}

// Inverse of easeToDifficulty. Recovers an ease factor from an FSRS
// difficulty value using the same linear mapping.
function difficultyToEase(difficulty: number): number {
  const clampedDifficulty = clamp(difficulty, FSRS_MIN_DIFFICULTY, FSRS_MAX_DIFFICULTY);
  const fraction =
    (FSRS_MAX_DIFFICULTY - clampedDifficulty) / (FSRS_MAX_DIFFICULTY - FSRS_MIN_DIFFICULTY);
  return SM2_MIN_EASE + fraction * (SM2_MAX_EASE - SM2_MIN_EASE);
}

// Converts SM-2 scheduling state into an equivalent FSRS state.
//
// This is a heuristic, not an exact translation: SM-2 has no concept of
// "stability" or "difficulty" as FSRS defines them, so we treat the current
// interval as a stand-in for stability (both represent roughly how many
// days until recall probability meaningfully drops) and map the ease
// factor onto FSRS's difficulty scale. Real FSRS parameters are normally
// fitted from review history; this gives a reasonable starting point when
// no such history is available.
export function sm2ToFsrs(state: Sm2CardState): FsrsCardState {
  const stability = Math.max(state.intervalDays, 0);
  return {
    stability,
    difficulty: easeToDifficulty(state.easeFactor),
    reviewCount: state.reviewCount,
    lastReviewedOn: state.lastReviewedOn,
    dueOn: addDays(state.lastReviewedOn, stability),
  };
}

// Converts FSRS scheduling state back into SM-2 state.
//
// Also heuristic and lossy in the same way as sm2ToFsrs: stability becomes
// the interval directly, and difficulty is mapped back onto an ease
// factor via the inverse of the forward mapping. Round-tripping through
// both functions will not exactly reproduce the original ease factor once
// it has been clamped to the SM-2 range.
export function fsrsToSm2(state: FsrsCardState): Sm2CardState {
  return {
    intervalDays: Math.max(Math.round(state.stability), 0),
    easeFactor: difficultyToEase(state.difficulty),
    reviewCount: state.reviewCount,
    lastReviewedOn: state.lastReviewedOn,
  };
}
