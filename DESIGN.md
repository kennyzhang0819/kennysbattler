# Animal Gossip — beam edition (current)

The parrot says a word in the direction of its arrow. The word travels
straight until it hits an animal; the animal changes it and sends it on
(straight, right or left by species). The beam must end at YOU.

Tiers, colour-coded: helpful (green: owl says a letter at a position, bee
says a contained letter; beam passes through them), transform (blue: crab,
octopus, fish, jellyfish), lossy (orange: shark), evil (purple, reserved).

Generator: constructs the beam by walking from the parrot, requires every
beam animal to be hit, and checks that the original is the only letter
string consistent with the heard word plus every helpful clue. No word
list is needed to solve. Reveal draws the beam and each hit.

---

# Animal Gossip — earlier chain prototype (superseded)

The 🦜 parrot says a word on a 3x3 board. YOU hear the garbled result and
type the original. No arrows, no numbering: order and whether an animal
acts at all come from positions, and each animal's rule says how.

- **Spread:** one or more parrots each say a word. A parrot whispers to
  every touching animal; each animal garbles every word it receives and
  whispers each result to every other touching animal. One animal can carry
  several words. YOU hear one word per message from each touching animal.
- **Listening order:** above, left, right, below. If one animal carries two
  words, the parrot higher on the board (reading order) goes first. The
  answer is each parrot's word once, in the order first heard ("SNOW WHITE").
- **Generator rules:** no parrot touches YOU; parrots + animals form a forest
  (every message reaches each animal by one path); every parrot's word
  reaches YOU garbled through at least one active animal; each parrot's word
  is the only list word that reproduces what you heard from it.
- Two parrots from case 7. `/?case=N` jumps to a case for testing.
- **Spatial rules:** crab always reverses; octopus rotates once per
  neighbour (parrot and YOU count); fish only acts if it shares a row or
  column with the parrot; jellyfish shifts letters by its distance from the
  parrot; shark eats the first letter only if adjacent to YOU.
- Decrypt only. The generator keeps a case only if exactly one word in
  `lib/gossip/words.ts` produces the heard output, so lossy animals are fine.
- 3 hearts per run; a wrong guess costs 1. Solving reveals order numbers,
  before → after per animal, and which animals were skipped.
- Side panel: hover previews, click pins. Rules can carry extra `notes`
  lines for animals with longer logic.
- Curve: cases 1–2 two animals, 3–5 three (shark from 4), then four.

Code: `lib/gossip/`, `components/gossip/`, `__tests__/gossip.test.ts`.

---

# Reef Census — earlier prototype (kept, unrouted)

A solo logic-deduction game inspired by the *shape* of Dupery (grid of
characters, each makes a claim, liars hide among them, limited mistakes)
but with its own rules and theme.

## Core loop (what is built now)

- **Board:** a 3×3 reef of sea creatures. Later cases expand to 4×4.
- **Hidden truth:** exactly K creatures are **mimics** (K is shown).
- **Claims:** every creature makes one statement, determined by its species.
  Honest creatures always tell the truth. Mimics always lie.
  Counts never include the speaker.
- **Species** (what it talks about):
  - 🦀 Crab — number of mimics among its 4 orthogonal neighbours
  - 🐙 Octopus — number of mimics among the *other* creatures in its row
  - 🪼 Jellyfish — same, for its column
  - 🐠 Fish — points at one neighbour and says "honest" or "mimic"
  - 🦈 Shark — number of mimics on its diagonals
- **Actions:** click to read, right-click to pencil-mark (❓ / ✔),
  "Accuse as mimic" to commit. Hovering a creature outlines the cells its
  claim is about.
- **Failure resource:** Trust (3). Accusing an honest creature costs 1 and
  reveals it as honest (so even a mistake buys information). 0 ends the run.
  A solved case restores 1.
- **Guarantee:** the generator brute-forces every K-subset and only emits
  puzzles with exactly one consistent answer, so no case ever needs a guess.
- **Case curve:** cases 1–2 are 3×3 with 2 mimics, 3–4 are 3×3 with 3,
  5–6 are 4×4 with 4, then 4×4 with 5.

Code: `lib/deduction/puzzle.ts` (species, evaluation, solver, generator,
statement text), `types/deduction.ts`, `components/deduction/*`,
tests in `__tests__/deduction.test.ts`.

## Where Dupery's ideas could still be borrowed (not copied)

- **Disguises.** In Dupery, evil roles *pretend* to be another role. Our
  version: a mimic may display a false species, so its statement *type*
  is also a lie. Needs a "suspect list" of species that could be present.
- **Quirks / modifiers per run.** "One creature is silent", "the mimic count
  is a range", "one honest creature is confused (randomly wrong)".
- **Reputation events between cases.** Choose a clue: reveal one cell type,
  gain Trust, or take a harder case for a bonus.
- **A final boss case** with a guaranteed disguised mimic.

## Alternative themes (same engine, different fiction)

The engine only needs: a grid of speakers, a hidden binary trait, truthful
vs. lying speakers, and a resource lost on wrong accusations. Any of these
drops in:

1. **Reef Census (current).** Mimics hiding among sea creatures. Fits the
   repo's existing ocean animals.
2. **Barnyard Thief.** Someone ate the carrots. Animals report what they
   saw; the guilty ones lie. Wrong accusations lose the farmer's patience.
3. **Night Watch.** A forest at night. Some animals are secretly *awake*
   (owls, raccoons) and sabotaging the camp; sleepers only talk in their
   sleep and tell the truth, the awake ones lie. Find who's awake.
4. **Infected Hive.** Bees, some carrying a fungus that makes them
   "buzz wrong". Honest bees report counts, infected ones mis-report.
   Theme reads as a quarantine puzzle rather than a crime.
5. **Changelings.** Fairy creatures swapped for real animals in a petting
   zoo. Changelings lie. Kids' theme, cute art.
6. **Robot Factory QA.** Units on a conveyor; some have a faulty sensor
   and report wrong neighbour readings. No "evil" at all, just defective
   units to pull from the line. Very clean logically.
7. **Spy Embassy.** Diplomats at a dinner table grid; double agents lie
   about who they sat next to. More adult tone, closer to Dupery.
8. **Treasure Map.** Pirates on a map grid; some are honest crew, some are
   deserters who lie about where the gold (hidden cells) is. The hidden
   trait becomes "cell has treasure" rather than "speaker is a liar" —
   a variant where speakers and targets are different things.

Themes 4 and 6 are worth noting because they remove "catching criminals"
entirely: the hidden trait is a *condition*, not guilt, and the mistakes
cost a neutral resource (time, budget) instead of reputation.

## Mechanical variants worth prototyping next

- **Hidden statements.** Only a few claims visible at first; each
  "interview" costs an action. Turns it from a static puzzle into a
  resource-management detective game.
- **Mixed liars.** Mimics lie, but a third class ("confused") is wrong
  50% of the time. Breaks pure logic and requires probability reasoning.
- **Two hidden traits.** e.g. mimic AND poisoned. Statements can talk about
  either. Grows the search space without growing the board.
