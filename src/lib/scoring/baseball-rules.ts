/**
 * Baseball Rules Engine
 *
 * Encodes baseball game rules for force plays, double plays, and runner
 * advancement. Based on the Retrosheet event file specification and the
 * Chadwick Bureau's reference implementation (chadwickbureau/chadwick).
 *
 * Retrosheet event codes reference:
 *   https://www.retrosheet.org/eventfile.htm
 *
 * Chadwick event types (field 34):
 *   2=generic out, 3=strikeout, 14=walk, 16=HBP, 18=error,
 *   19=fielder's choice, 20=single, 21=double, 22=triple, 23=home run
 *
 * Chadwick double play flags:
 *   /GDP = ground ball double play, /LDP = line drive DP, /FDP = fly ball DP
 *
 * Retrosheet runner advance notation:
 *   B-1 (batter to first), 1-3 (first to third), 2-H (second scores)
 *   1X2(64) = runner out at second (SS to 2B)
 *
 * Fielding positions: 1=P, 2=C, 3=1B, 4=2B, 5=3B, 6=SS, 7=LF, 8=CF, 9=RF
 */

import type { PlateAppearanceResult, BaseRunner, RunnerAdvance } from "./types";

// === Base State Utilities ===

export interface BaseState {
  first: BaseRunner | null;
  second: BaseRunner | null;
  third: BaseRunner | null;
}

/**
 * Determine which bases have forced runners.
 *
 * A runner is "forced" when the batter becomes a runner and all bases
 * behind that runner are occupied (MLB Rule 5.09(b)(6)). The force
 * propagates from first base forward through consecutively occupied bases.
 *
 * Examples:
 *   Runner on 1st only       → 1st is forced (must advance to 2nd)
 *   Runners on 1st & 2nd     → both forced (1st→2nd, 2nd→3rd)
 *   Runners on 1st & 3rd     → only 1st forced (3rd is NOT forced — 2nd is empty)
 *   Bases loaded              → all three forced
 *   Runner on 2nd only       → nobody forced (1st is empty, chain breaks)
 *   Runner on 3rd only       → nobody forced
 */
export function getForcedBases(state: BaseState): Set<"first" | "second" | "third"> {
  const forced = new Set<"first" | "second" | "third">();

  // Force chain starts at first and propagates through consecutively occupied bases
  if (state.first) {
    forced.add("first");
    if (state.second) {
      forced.add("second");
      if (state.third) {
        forced.add("third");
      }
    }
  }

  return forced;
}

/**
 * Check if a specific runner is forced to advance.
 */
export function isRunnerForced(
  state: BaseState,
  base: "first" | "second" | "third"
): boolean {
  return getForcedBases(state).has(base);
}

// === Double Play Logic ===

/**
 * Retrosheet double play types:
 *   GDP = Ground ball double play (most common, ~90% of DPs)
 *   LDP = Line drive double play (liner caught, runner doubled off)
 *   FDP = Fly ball double play (fly caught, runner thrown out)
 *
 * Chadwick flags: dp_flag (general DP), gdp_flag (ground DP), tp_flag (triple play)
 */
export type DoublePlayType = "GDP" | "LDP" | "FDP";

export interface DoublePlayResult {
  type: DoublePlayType;
  /** Which runner (by base) is the second out. The batter is always the first or second out. */
  runnerOut: "first" | "second" | "third" | "batter";
  batterOut: boolean;
  /** Typical fielding sequence (e.g., "6-4-3") */
  notation: string;
}

/**
 * Determine valid double play scenarios given the current base state
 * and batted ball type.
 *
 * Ground ball double play (GDP):
 *   Requires at least one forced runner. The most common GDP patterns
 *   (from Retrosheet data) are:
 *     - Runner on 1st: 6-4-3, 4-6-3, 5-4-3, 1-6-3, 3-6-3
 *       (force runner at 2nd, relay to 1st for batter)
 *     - Runners on 1st & 2nd: same as above, or 5-4-3 lead runner
 *     - Bases loaded: same plus potential 2-6-3, 1-2-3 (home to first)
 *
 * Line drive double play (LDP):
 *   Batter out on the catch, runner doubled off their base (not tagging up).
 *   Can happen with runner on any base.
 *
 * Fly ball double play (FDP):
 *   Batter out on the catch, runner thrown out trying to advance
 *   (usually tagging from 3rd and thrown out at home, or tagging from
 *   2nd and thrown out at 3rd). Requires runner on base.
 */
export function getDoublePlayScenarios(
  state: BaseState,
  fieldPosition: number | null
): DoublePlayResult[] {
  const scenarios: DoublePlayResult[] = [];
  const forced = getForcedBases(state);

  // GDP scenarios: require a force play (runner on 1st minimum)
  if (forced.has("first")) {
    // Standard GDP: force at 2nd, throw to 1st
    // The runner on 1st is forced out at 2nd, batter out at 1st
    const gdpNotation = getGDPNotation(fieldPosition);
    scenarios.push({
      type: "GDP",
      runnerOut: "first",
      batterOut: true,
      notation: gdpNotation,
    });

    // With runners on 1st and 2nd, can also get lead runner
    if (forced.has("second")) {
      scenarios.push({
        type: "GDP",
        runnerOut: "second",
        batterOut: true,
        notation: fieldPosition === 5 ? "5-4-3" : "6-4-3",
      });
    }

    // Bases loaded: can go home to first
    if (forced.has("second") && forced.has("third")) {
      scenarios.push({
        type: "GDP",
        runnerOut: "third",
        batterOut: true,
        notation: "2-6-3",
      });
      // Or 1-2-3 (pitcher to catcher to first)
      scenarios.push({
        type: "GDP",
        runnerOut: "third",
        batterOut: true,
        notation: "1-2-3",
      });
    }
  }

  // LDP scenarios: batter caught on line drive, runner doubled off
  if (state.first) {
    scenarios.push({
      type: "LDP",
      runnerOut: "first",
      batterOut: true,
      notation: fieldPosition ? `L${fieldPosition}-DP` : "LDP",
    });
  }
  if (state.second) {
    scenarios.push({
      type: "LDP",
      runnerOut: "second",
      batterOut: true,
      notation: fieldPosition ? `L${fieldPosition}-DP` : "LDP",
    });
  }

  // FDP scenarios: fly caught, runner thrown out advancing/tagging
  if (state.third) {
    scenarios.push({
      type: "FDP",
      runnerOut: "third",
      batterOut: true,
      notation: fieldPosition ? `F${fieldPosition}-DP` : "FDP",
    });
  }

  return scenarios;
}

/**
 * Get the most likely GDP fielding notation based on where the ball was hit.
 * Uses standard Retrosheet fielding position numbers.
 */
function getGDPNotation(fieldPosition: number | null): string {
  switch (fieldPosition) {
    case 6: return "6-4-3"; // SS → 2B → 1B (most common)
    case 4: return "4-6-3"; // 2B → SS → 1B
    case 5: return "5-4-3"; // 3B → 2B → 1B
    case 1: return "1-6-3"; // P → SS → 1B
    case 3: return "3-6-3"; // 1B → SS → 1B
    default: return "6-4-3";
  }
}

/**
 * Get the default double play result for the current base state.
 * Called when the scorer selects "DP" — returns which runner is out and
 * the auto-generated runner advances.
 *
 * Default behavior follows the most common GDP pattern:
 *   - Batter is always out (does not reach base)
 *   - The lowest forced runner is the second out
 *   - Remaining runners advance one base if forced, stay put otherwise
 *
 * This follows Chadwick's fc_flag / force_flag logic where forced runners
 * are tracked per-base.
 */
export function getDefaultDoublePlayResult(
  state: BaseState,
  fieldPosition: number | null
): {
  runnerAdvances: RunnerAdvance[];
  outsRecorded: 2;
  notation: string;
} {
  const forced = getForcedBases(state);
  const advances: RunnerAdvance[] = [];

  if (forced.has("first")) {
    // Most common: GDP, runner on 1st out at 2nd, batter out at 1st
    //
    // With just runner on 1st:
    //   Runner on 1st → out (does not advance)
    //   Batter → out
    advances.push({ from: "first", to: "out" });

    if (state.second && !forced.has("second")) {
      // Runner on 1st and 3rd (2nd empty): runner on 3rd stays
      // Runner on 1st is forced out, batter out at 1st
      // Runner on 3rd is NOT forced, stays at 3rd
    } else if (forced.has("second")) {
      // Runners on 1st & 2nd (both forced):
      //   Runner on 1st → out at 2nd
      //   Runner on 2nd → advances to 3rd (force released after DP)
      //   Batter → out at 1st
      advances.push({ from: "second", to: "third" });

      if (forced.has("third")) {
        // Bases loaded:
        //   Runner on 1st → out at 2nd
        //   Runner on 2nd → 3rd
        //   Runner on 3rd → scores (force released after first out)
        advances.push({ from: "third", to: "home" });
      }
    }
  } else if (state.second || state.third) {
    // No force play available — this is an LDP or FDP
    // Line drive / fly ball DP: batter out on catch, lead runner doubled off
    if (state.third) {
      advances.push({ from: "third", to: "out" });
    } else if (state.second) {
      advances.push({ from: "second", to: "out" });
    }
    // Other runners hold
  }

  const notation = forced.has("first")
    ? getGDPNotation(fieldPosition)
    : fieldPosition
      ? `L${fieldPosition}-DP`
      : "DP";

  return { runnerAdvances: advances, outsRecorded: 2, notation };
}

// === Runner Advancement Defaults ===

/**
 * Default runner advancement rules by play result.
 *
 * Based on Retrosheet advance notation conventions and common game situations.
 * These represent the "typical" advance — scorers can override for unusual plays.
 *
 * Retrosheet notation reference:
 *   B-1 = batter to first
 *   1-2 = runner from first to second
 *   1-3 = runner from first to third
 *   2-H = runner from second scores (home)
 *   3-H = runner from third scores
 *
 * From Retrosheet/Chadwick runner destination codes (fields 58-65):
 *   0 = runner put out
 *   1-3 = on that base
 *   4 = scored (earned)
 *   5 = scored (unearned)
 */
export function getDefaultRunnerAdvances(
  result: PlateAppearanceResult,
  state: BaseState
): RunnerAdvance[] {
  switch (result) {
    case "1B":
      return getSingleAdvances(state);
    case "2B":
      return getDoubleAdvances(state);
    case "3B":
      return getTripleAdvances(state);
    case "HR":
      return getHomeRunAdvances(state);
    case "BB":
    case "HBP":
      return getWalkAdvances(state);
    case "GO":
      return getGroundOutAdvances(state);
    case "FO":
      return getFlyOutAdvances(state);
    case "FC":
      return getFieldersChoiceAdvances(state);
    case "DP":
      return getDefaultDoublePlayResult(state, null).runnerAdvances;
    case "SAC":
      return getSacrificeAdvances(state);
    case "E":
    case "ROE":
      return getErrorAdvances(state);
    case "SO":
      return []; // No runner movement on strikeout (by default)
    default:
      return [];
  }
}

/**
 * Single (Chadwick event type 20):
 *   - Runner on 3rd → scores (3-H)
 *   - Runner on 2nd → scores or to 3rd (typically scores on a single)
 *   - Runner on 1st → to 2nd (conservative) or to 3rd
 *   - Batter → 1st (B-1)
 *
 * Default: runners advance 2 bases from 2nd, 1 base from 1st
 * (conservative default — scorer adjusts for aggressive baserunning)
 */
function getSingleAdvances(state: BaseState): RunnerAdvance[] {
  const advances: RunnerAdvance[] = [];
  if (state.third) advances.push({ from: "third", to: "home" });
  if (state.second) advances.push({ from: "second", to: "home" });
  if (state.first) advances.push({ from: "first", to: "second" });
  return advances;
}

/**
 * Double (Chadwick event type 21):
 *   - All runners score from 2nd and 3rd
 *   - Runner on 1st → to 3rd (conservative) or scores
 *   - Batter → 2nd (B-2)
 */
function getDoubleAdvances(state: BaseState): RunnerAdvance[] {
  const advances: RunnerAdvance[] = [];
  if (state.third) advances.push({ from: "third", to: "home" });
  if (state.second) advances.push({ from: "second", to: "home" });
  if (state.first) advances.push({ from: "first", to: "third" });
  return advances;
}

/**
 * Triple (Chadwick event type 22):
 *   - All runners score
 *   - Batter → 3rd (B-3)
 */
function getTripleAdvances(state: BaseState): RunnerAdvance[] {
  const advances: RunnerAdvance[] = [];
  if (state.third) advances.push({ from: "third", to: "home" });
  if (state.second) advances.push({ from: "second", to: "home" });
  if (state.first) advances.push({ from: "first", to: "home" });
  return advances;
}

/**
 * Home Run (Chadwick event type 23):
 *   - All runners score, batter scores
 *   - Batter is handled separately by the game engine (HR adds 1 for batter)
 */
function getHomeRunAdvances(state: BaseState): RunnerAdvance[] {
  const advances: RunnerAdvance[] = [];
  if (state.third) advances.push({ from: "third", to: "home" });
  if (state.second) advances.push({ from: "second", to: "home" });
  if (state.first) advances.push({ from: "first", to: "home" });
  return advances;
}

/**
 * Walk / HBP (Chadwick event types 14, 16):
 *   Only forced runners advance. The force chain propagates from first base.
 *   - Batter → 1st (B-1)
 *   - Runner on 1st → 2nd (forced by batter)
 *   - Runner on 2nd → 3rd (only if 1st is occupied, creating the force)
 *   - Runner on 3rd → scores (only if 1st AND 2nd occupied)
 *
 * Per MLB Rule 5.05(b)(1): "The batter becomes a runner when four balls
 * have been called by the umpire" — forced runners advance one base.
 */
function getWalkAdvances(state: BaseState): RunnerAdvance[] {
  const advances: RunnerAdvance[] = [];
  const forced = getForcedBases(state);

  if (forced.has("third")) advances.push({ from: "third", to: "home" });
  if (forced.has("second")) advances.push({ from: "second", to: "third" });
  if (forced.has("first")) advances.push({ from: "first", to: "second" });
  return advances;
}

/**
 * Ground Out (Chadwick event type 2, batted ball type 'G'):
 *   - Runner on 3rd → scores if less than 2 outs (tag up or just runs)
 *   - Runner on 2nd → advances to 3rd
 *   - Runner on 1st → forced to 2nd (if not part of the out)
 *
 * Default assumes the batter is the one put out (most common ground out).
 * Force play outs at other bases are handled by FC or DP results instead.
 */
function getGroundOutAdvances(state: BaseState): RunnerAdvance[] {
  const advances: RunnerAdvance[] = [];
  if (state.third) advances.push({ from: "third", to: "home" });
  if (state.second) advances.push({ from: "second", to: "third" });
  if (state.first) advances.push({ from: "first", to: "second" });
  return advances;
}

/**
 * Fly Out (Chadwick event type 2, batted ball type 'F' or 'L'):
 *   - Runner on 3rd → scores (sacrifice fly / tagging up) if < 2 outs
 *   - Runner on 2nd → may advance to 3rd (tagging up on deep fly)
 *   - Runner on 1st → typically holds
 *
 * Per MLB Rule 5.09(c)(1): "After a fly ball is caught, runners must
 * retouch their base before advancing."
 *
 * Default: runner on 3rd tags and scores, others hold.
 */
function getFlyOutAdvances(state: BaseState): RunnerAdvance[] {
  const advances: RunnerAdvance[] = [];
  if (state.third) advances.push({ from: "third", to: "home" });
  // Runners on 1st and 2nd hold by default (scorer can override for tag-ups)
  return advances;
}

/**
 * Fielder's Choice (Chadwick event type 19):
 *   The batter reaches base because the defense chose to put out a
 *   preceding runner instead.
 *
 *   Per Chadwick's fc_flag[]: the fielder's choice flag is set per-base
 *   to indicate which runner the defense chose to retire.
 *
 *   Default: the lead forced runner is put out, batter reaches first.
 *   - Runner on 1st, FC → runner on 1st out at 2nd, batter safe at 1st
 *   - Runners on 1st & 2nd → runner on 2nd out at 3rd, runner on 1st to 2nd
 */
function getFieldersChoiceAdvances(state: BaseState): RunnerAdvance[] {
  const advances: RunnerAdvance[] = [];
  const forced = getForcedBases(state);

  if (forced.has("second") && state.second) {
    // Lead force: runner on 2nd is out, runner on 1st advances
    advances.push({ from: "second", to: "out" });
    advances.push({ from: "first", to: "second" });
    if (forced.has("third") && state.third) {
      advances.push({ from: "third", to: "home" });
    }
  } else if (forced.has("first") && state.first) {
    // Only runner on 1st: out at 2nd
    advances.push({ from: "first", to: "out" });
  } else if (state.third) {
    // Runner on 3rd only (no force): defense tries to get runner at home
    advances.push({ from: "third", to: "out" });
  } else if (state.second) {
    // Runner on 2nd only (no force): defense tries to get runner at 3rd
    advances.push({ from: "second", to: "out" });
  }

  return advances;
}

/**
 * Sacrifice (bunt or fly):
 *   Batter is out, but advances a runner.
 *   - SAC bunt: typically moves runner from 1st to 2nd, or 2nd to 3rd
 *   - SAC fly: runner on 3rd tags up and scores
 *
 * Default: advance lead runner one base, batter out.
 */
function getSacrificeAdvances(state: BaseState): RunnerAdvance[] {
  const advances: RunnerAdvance[] = [];
  if (state.third) advances.push({ from: "third", to: "home" });
  else if (state.second) advances.push({ from: "second", to: "third" });
  else if (state.first) advances.push({ from: "first", to: "second" });
  return advances;
}

/**
 * Error (Chadwick event type 18):
 *   Batter reaches base due to a fielding error.
 *   Runner advancement is similar to a single.
 */
function getErrorAdvances(state: BaseState): RunnerAdvance[] {
  return getSingleAdvances(state);
}

// === Utility: Can a Double Play Occur? ===

/**
 * Returns true if a double play is possible in the current base state.
 * A DP requires at least one runner on base (for GDP, a forced runner;
 * for LDP/FDP, any runner).
 */
export function canDoublePlay(state: BaseState): boolean {
  return !!(state.first || state.second || state.third);
}

/**
 * Returns true if a ground ball double play (GDP) is possible.
 * GDP requires at least a runner on first (to create a force at second).
 */
export function canGroundBallDoublePlay(state: BaseState): boolean {
  return !!state.first;
}

// === Utility: Count Runners ===

export function countRunners(state: BaseState): number {
  return (state.first ? 1 : 0) + (state.second ? 1 : 0) + (state.third ? 1 : 0);
}

/**
 * Get a human-readable description of the base state.
 * Uses Retrosheet's base-state encoding (used in 24 base-out states for RE24).
 */
export function describeBaseState(state: BaseState): string {
  const bases: string[] = [];
  if (state.first) bases.push("1st");
  if (state.second) bases.push("2nd");
  if (state.third) bases.push("3rd");
  if (bases.length === 0) return "Bases empty";
  if (bases.length === 3) return "Bases loaded";
  return `Runner(s) on ${bases.join(" & ")}`;
}
