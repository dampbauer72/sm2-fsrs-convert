// Card scheduling state as tracked by the classic SM-2 algorithm (Anki's
// original scheduler, and most SuperMemo-derived apps).
export interface Sm2CardState {
  // Current interval in days, i.e. how long until the card is due again.
  intervalDays: number;
  // Ease factor as a multiplier, e.g. 2.5 means 250%. SM-2 clamps this
  // to a minimum of 1.3 in most implementations.
  easeFactor: number;
  // Number of times this card has been reviewed (successfully or not).
  reviewCount: number;
  // ISO 8601 date (YYYY-MM-DD) of the most recent review.
  lastReviewedOn: string;
}

// Card scheduling state as tracked by FSRS (Free Spaced Repetition
// Scheduler), the algorithm Anki added as an alternative to SM-2 in 2023.
export interface FsrsCardState {
  // Stability: days until recall probability is estimated to drop to 90%.
  stability: number;
  // Difficulty on FSRS's 1-10 scale, where higher means harder to recall.
  difficulty: number;
  // Number of times this card has been reviewed. Carried over unchanged
  // during conversion since both algorithms track it the same way.
  reviewCount: number;
  // ISO 8601 date (YYYY-MM-DD) of the most recent review.
  lastReviewedOn: string;
  // ISO 8601 date (YYYY-MM-DD) the card is next due.
  dueOn: string;
}
