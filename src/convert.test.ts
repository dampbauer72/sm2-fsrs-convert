import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fsrsToSm2, sm2ToFsrs } from "./convert.js";
import type { FsrsCardState, Sm2CardState } from "./types.js";

describe("sm2ToFsrs", () => {
  it("carries interval over as stability, unchanged", () => {
    const sm2: Sm2CardState = {
      intervalDays: 14,
      easeFactor: 2.5,
      reviewCount: 6,
      lastReviewedOn: "2026-09-10",
    };
    const fsrs = sm2ToFsrs(sm2);
    assert.equal(fsrs.stability, 14);
  });

  it("passes reviewCount and lastReviewedOn through unchanged", () => {
    const sm2: Sm2CardState = {
      intervalDays: 3,
      easeFactor: 2.0,
      reviewCount: 9,
      lastReviewedOn: "2026-01-15",
    };
    const fsrs = sm2ToFsrs(sm2);
    assert.equal(fsrs.reviewCount, 9);
    assert.equal(fsrs.lastReviewedOn, "2026-01-15");
  });

  it("computes dueOn as lastReviewedOn plus the interval", () => {
    const sm2: Sm2CardState = {
      intervalDays: 10,
      easeFactor: 2.5,
      reviewCount: 4,
      lastReviewedOn: "2026-09-10",
    };
    const fsrs = sm2ToFsrs(sm2);
    assert.equal(fsrs.dueOn, "2026-09-20");
  });

  it("maps the midpoint ease factor to the midpoint difficulty", () => {
    // SM2_MIN_EASE 1.3, SM2_MAX_EASE 3.0 -> midpoint 2.15
    // FSRS_MIN_DIFFICULTY 1, FSRS_MAX_DIFFICULTY 10 -> midpoint 5.5
    const fsrs = sm2ToFsrs({
      intervalDays: 1,
      easeFactor: 2.15,
      reviewCount: 1,
      lastReviewedOn: "2026-01-01",
    });
    assert.ok(Math.abs(fsrs.difficulty - 5.5) < 1e-9);
  });

  it("maps a low ease factor to high difficulty and a high ease factor to low difficulty", () => {
    const easy = sm2ToFsrs({
      intervalDays: 1,
      easeFactor: 3.0,
      reviewCount: 1,
      lastReviewedOn: "2026-01-01",
    });
    const hard = sm2ToFsrs({
      intervalDays: 1,
      easeFactor: 1.3,
      reviewCount: 1,
      lastReviewedOn: "2026-01-01",
    });
    assert.ok(easy.difficulty < hard.difficulty);
    assert.ok(Math.abs(easy.difficulty - 1) < 1e-9);
    assert.ok(Math.abs(hard.difficulty - 10) < 1e-9);
  });

  it("clamps ease factors outside the conventional SM-2 range", () => {
    const belowMin = sm2ToFsrs({
      intervalDays: 1,
      easeFactor: 1.0,
      reviewCount: 1,
      lastReviewedOn: "2026-01-01",
    });
    const aboveMax = sm2ToFsrs({
      intervalDays: 1,
      easeFactor: 4.0,
      reviewCount: 1,
      lastReviewedOn: "2026-01-01",
    });
    assert.equal(belowMin.difficulty, 10);
    assert.equal(aboveMax.difficulty, 1);
  });

  it("treats a negative interval as zero stability due on the review date itself", () => {
    const fsrs = sm2ToFsrs({
      intervalDays: -5,
      easeFactor: 2.5,
      reviewCount: 1,
      lastReviewedOn: "2026-01-01",
    });
    assert.equal(fsrs.stability, 0);
    assert.equal(fsrs.dueOn, "2026-01-01");
  });
});

describe("fsrsToSm2", () => {
  it("rounds stability to the nearest whole-day interval", () => {
    const fsrs: FsrsCardState = {
      stability: 14.6,
      difficulty: 5.5,
      reviewCount: 6,
      lastReviewedOn: "2026-09-10",
      dueOn: "2026-09-25",
    };
    const sm2 = fsrsToSm2(fsrs);
    assert.equal(sm2.intervalDays, 15);
  });

  it("passes reviewCount and lastReviewedOn through unchanged", () => {
    const fsrs: FsrsCardState = {
      stability: 3,
      difficulty: 5,
      reviewCount: 9,
      lastReviewedOn: "2026-01-15",
      dueOn: "2026-01-18",
    };
    const sm2 = fsrsToSm2(fsrs);
    assert.equal(sm2.reviewCount, 9);
    assert.equal(sm2.lastReviewedOn, "2026-01-15");
  });

  it("clamps negative stability to a zero interval", () => {
    const sm2 = fsrsToSm2({
      stability: -2,
      difficulty: 5,
      reviewCount: 1,
      lastReviewedOn: "2026-01-01",
      dueOn: "2026-01-01",
    });
    assert.equal(sm2.intervalDays, 0);
  });

  it("clamps difficulty outside the 1-10 scale before recovering an ease factor", () => {
    const belowMin = fsrsToSm2({
      stability: 1,
      difficulty: 0,
      reviewCount: 1,
      lastReviewedOn: "2026-01-01",
      dueOn: "2026-01-02",
    });
    const aboveMax = fsrsToSm2({
      stability: 1,
      difficulty: 15,
      reviewCount: 1,
      lastReviewedOn: "2026-01-01",
      dueOn: "2026-01-02",
    });
    assert.equal(belowMin.easeFactor, 3.0);
    assert.equal(aboveMax.easeFactor, 1.3);
  });

  it("is the inverse of sm2ToFsrs's difficulty mapping at the midpoint", () => {
    const sm2 = fsrsToSm2({
      stability: 1,
      difficulty: 5.5,
      reviewCount: 1,
      lastReviewedOn: "2026-01-01",
      dueOn: "2026-01-02",
    });
    assert.ok(Math.abs(sm2.easeFactor - 2.15) < 1e-9);
  });
});

describe("round trip", () => {
  it("recovers the original ease factor when it is already an exact round-trip fixed point", () => {
    const original: Sm2CardState = {
      intervalDays: 7,
      easeFactor: 2.15,
      reviewCount: 5,
      lastReviewedOn: "2026-05-01",
    };
    const roundTripped = fsrsToSm2(sm2ToFsrs(original));
    assert.ok(Math.abs(roundTripped.easeFactor - original.easeFactor) < 1e-9);
    assert.equal(roundTripped.intervalDays, original.intervalDays);
    assert.equal(roundTripped.reviewCount, original.reviewCount);
    assert.equal(roundTripped.lastReviewedOn, original.lastReviewedOn);
  });

  it("clamps an out-of-range ease factor on the way out, so the round trip does not recover it", () => {
    const original: Sm2CardState = {
      intervalDays: 7,
      easeFactor: 4.0,
      reviewCount: 5,
      lastReviewedOn: "2026-05-01",
    };
    const roundTripped = fsrsToSm2(sm2ToFsrs(original));
    assert.equal(roundTripped.easeFactor, 3.0);
  });
});
