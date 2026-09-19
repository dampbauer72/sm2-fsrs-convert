# sm2-fsrs-convert

Converts spaced repetition card scheduling state between the classic SM-2
algorithm (the scheduler most flashcard apps, including older versions of
Anki, have used for decades) and FSRS (the newer scheduler Anki added as an
alternative in 2023).

## The problem

SM-2 and FSRS describe a card's memory state completely differently. SM-2
tracks an interval and an ease factor; FSRS tracks a stability and a
difficulty. If you're migrating review history between tools, or writing a
scheduler that needs to interoperate with both, there's no built-in way to
go from one representation to the other.

There's no exact translation, since the two algorithms don't model memory
the same way. What this library does is give you a documented, deterministic
approximation: SM-2's interval becomes FSRS's stability (both are roughly
"days until recall probability drops meaningfully"), and the ease factor is
mapped onto FSRS's 1-10 difficulty scale. See the comments in
`src/convert.ts` for the exact mapping and its limitations.

## Usage

```ts
import { sm2ToFsrs, fsrsToSm2 } from "sm2-fsrs-convert";

const sm2Card = {
  intervalDays: 14,
  easeFactor: 2.3,
  reviewCount: 6,
  lastReviewedOn: "2026-09-10",
};

const fsrsCard = sm2ToFsrs(sm2Card);
// {
//   stability: 14,
//   difficulty: 6.076...,
//   reviewCount: 6,
//   lastReviewedOn: "2026-09-10",
//   dueOn: "2026-09-24",
// }

const roundTripped = fsrsToSm2(fsrsCard);
// intervalDays and reviewCount survive exactly; easeFactor is recovered
// from difficulty and may differ slightly from the original due to the
// difficulty scale's coarser precision.
```

Both `sm2ToFsrs` and `fsrsToSm2` are pure functions: same input always
produces the same output, with no I/O, no shared state, and no reliance on
the current date. That makes them straightforward to unit test with plain
input/output fixtures.

## Building

This is plain TypeScript with no runtime dependencies. Compile with your
own `tsc` (see `tsconfig.json`):

```sh
tsc
```

## Status

Early skeleton. The ease-factor/difficulty mapping is a first-pass linear
approximation and hasn't been validated against real review data yet.
