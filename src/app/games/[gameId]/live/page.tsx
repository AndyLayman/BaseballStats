"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SprayChart } from "@/components/scoring/SprayChart";
import {
  createInitialGameState,
  getCurrentBatter,
  recordAtBat,
  recordOpponentOut,
  recordOpponentRun,
} from "@/lib/scoring/game-engine";
import { sprayToPosition, generateNotation } from "@/lib/scoring/scorebook";
import { isAtBat, isHit, totalBases } from "@/lib/stats/calculations";
import type { GameState, PlateAppearanceResult, RecordAtBatPayload, RunnerAdvance, Player, GameLineup } from "@/lib/scoring/types";

const RESULT_BUTTONS: { result: PlateAppearanceResult; label: string; color: string }[] = [
  { result: "1B", label: "1B", color: "bg-green-600 hover:bg-green-700 active:bg-green-800" },
  { result: "2B", label: "2B", color: "bg-blue-600 hover:bg-blue-700 active:bg-blue-800" },
  { result: "3B", label: "3B", color: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800" },
  { result: "HR", label: "HR", color: "bg-red-600 hover:bg-red-700 active:bg-red-800" },
  { result: "BB", label: "BB", color: "bg-purple-600 hover:bg-purple-700 active:bg-purple-800" },
  { result: "SO", label: "K", color: "bg-gray-600 hover:bg-gray-700 active:bg-gray-800" },
  { result: "GO", label: "GO", color: "bg-gray-500 hover:bg-gray-600 active:bg-gray-700" },
  { result: "FO", label: "FO", color: "bg-gray-500 hover:bg-gray-600 active:bg-gray-700" },
  { result: "FC", label: "FC", color: "bg-gray-500 hover:bg-gray-600 active:bg-gray-700" },
  { result: "SAC", label: "SAC", color: "bg-gray-500 hover:bg-gray-600 active:bg-gray-700" },
  { result: "HBP", label: "HBP", color: "bg-purple-600 hover:bg-purple-700 active:bg-purple-800" },
  { result: "E", label: "E", color: "bg-orange-600 hover:bg-orange-700 active:bg-orange-800" },
];

export default function LiveScoringPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [stateHistory, setStateHistory] = useState<GameState[]>([]);
  const [selectedResult, setSelectedResult] = useState<PlateAppearanceResult | null>(null);
  const [sprayPoint, setSprayPoint] = useState<{ x: number; y: number } | null>(null);
  const [rbis, setRbis] = useState(0);
  const [stolenBases, setStolenBases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playLog, setPlayLog] = useState<{ notation: string; playerName: string; inning: number }[]>([]);

  // Wake Lock to prevent screen sleep during scoring
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Wake Lock not supported or failed — not critical
      }
    }
    requestWakeLock();
    // Re-acquire on visibility change (e.g., switching back to tab)
    function handleVisibility() {
      if (document.visibilityState === "visible") requestWakeLock();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      wakeLock?.release();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    async function load() {
      const [gameRes, lineupRes, playersRes, stateRes] = await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).single(),
        supabase.from("game_lineup").select("*").eq("game_id", gameId).order("batting_order"),
        supabase.from("players").select("*"),
        supabase.from("game_state").select("*").eq("game_id", gameId).single(),
      ]);

      const lineup: GameLineup[] = lineupRes.data ?? [];
      const players: Player[] = playersRes.data ?? [];

      let state: GameState;
      if (stateRes.data) {
        state = {
          gameId,
          currentInning: stateRes.data.current_inning,
          currentHalf: stateRes.data.current_half,
          outs: stateRes.data.outs,
          runnerFirst: stateRes.data.runner_first
            ? { playerId: stateRes.data.runner_first, playerName: players.find((p) => p.id === stateRes.data.runner_first)?.name ?? "" }
            : null,
          runnerSecond: stateRes.data.runner_second
            ? { playerId: stateRes.data.runner_second, playerName: players.find((p) => p.id === stateRes.data.runner_second)?.name ?? "" }
            : null,
          runnerThird: stateRes.data.runner_third
            ? { playerId: stateRes.data.runner_third, playerName: players.find((p) => p.id === stateRes.data.runner_third)?.name ?? "" }
            : null,
          currentBatterIndex: stateRes.data.current_batter_index,
          ourScore: gameRes.data?.our_score ?? 0,
          opponentScore: gameRes.data?.opponent_score ?? 0,
          lineup,
          players,
        };
      } else {
        state = createInitialGameState(gameId, lineup, players);
      }

      setGameState(state);

      if (gameRes.data?.status === "scheduled") {
        await supabase.from("games").update({ status: "in_progress" }).eq("id", gameId);
      }

      const { data: pas } = await supabase
        .from("plate_appearances")
        .select("*")
        .eq("game_id", gameId)
        .order("created_at");

      if (pas) {
        setPlayLog(
          pas.map((pa) => ({
            notation: pa.scorebook_notation || pa.result,
            playerName: players.find((p) => p.id === pa.player_id)?.name ?? "",
            inning: pa.inning,
          }))
        );
      }

      setLoading(false);
    }
    load();
  }, [gameId]);

  const persistState = useCallback(
    async (state: GameState) => {
      await Promise.all([
        supabase.from("game_state").upsert({
          game_id: gameId,
          current_inning: state.currentInning,
          current_half: state.currentHalf,
          outs: state.outs,
          runner_first: state.runnerFirst?.playerId ?? null,
          runner_second: state.runnerSecond?.playerId ?? null,
          runner_third: state.runnerThird?.playerId ?? null,
          current_batter_index: state.currentBatterIndex,
          updated_at: new Date().toISOString(),
        }),
        supabase.from("games").update({
          our_score: state.ourScore,
          opponent_score: state.opponentScore,
          innings_played: state.currentInning,
        }).eq("id", gameId),
      ]);
    },
    [gameId]
  );

  async function handleConfirmAtBat() {
    if (!gameState || !selectedResult) return;

    const batter = getCurrentBatter(gameState);
    if (!batter) return;

    const fieldPosition = sprayPoint ? sprayToPosition(sprayPoint.x, sprayPoint.y) : null;
    const notation = generateNotation(selectedResult, fieldPosition);

    const runnerAdvances: RunnerAdvance[] = [];

    if (["HR"].includes(selectedResult)) {
      if (gameState.runnerThird) runnerAdvances.push({ from: "third", to: "home" });
      if (gameState.runnerSecond) runnerAdvances.push({ from: "second", to: "home" });
      if (gameState.runnerFirst) runnerAdvances.push({ from: "first", to: "home" });
    } else if (["3B"].includes(selectedResult)) {
      if (gameState.runnerThird) runnerAdvances.push({ from: "third", to: "home" });
      if (gameState.runnerSecond) runnerAdvances.push({ from: "second", to: "home" });
      if (gameState.runnerFirst) runnerAdvances.push({ from: "first", to: "home" });
    } else if (["2B"].includes(selectedResult)) {
      if (gameState.runnerThird) runnerAdvances.push({ from: "third", to: "home" });
      if (gameState.runnerSecond) runnerAdvances.push({ from: "second", to: "home" });
      if (gameState.runnerFirst) runnerAdvances.push({ from: "first", to: "third" });
    } else if (["1B", "BB", "HBP", "E", "ROE", "FC"].includes(selectedResult)) {
      if (gameState.runnerThird) runnerAdvances.push({ from: "third", to: "home" });
      if (gameState.runnerSecond) runnerAdvances.push({ from: "second", to: "third" });
      if (gameState.runnerFirst) runnerAdvances.push({ from: "first", to: "second" });
    }

    const payload: RecordAtBatPayload = {
      result: selectedResult,
      sprayX: sprayPoint?.x ?? null,
      sprayY: sprayPoint?.y ?? null,
      rbis,
      stolenBases,
      scorebookNotation: notation,
      fieldingPlays: [],
      runnerAdvances,
    };

    setStateHistory((prev) => [...prev, gameState]);
    const newState = recordAtBat(gameState, payload);

    await supabase.from("plate_appearances").insert({
      game_id: gameId,
      player_id: batter.playerId,
      inning: gameState.currentInning,
      batting_order: gameState.currentBatterIndex % gameState.lineup.length + 1,
      result: selectedResult,
      scorebook_notation: notation,
      spray_x: sprayPoint?.x ?? null,
      spray_y: sprayPoint?.y ?? null,
      rbis,
      stolen_bases: stolenBases,
      is_at_bat: isAtBat(selectedResult),
      is_hit: isHit(selectedResult),
      total_bases: totalBases(selectedResult),
    });

    setPlayLog((prev) => [
      ...prev,
      { notation, playerName: batter.playerName, inning: gameState.currentInning },
    ]);

    setGameState(newState);
    await persistState(newState);

    setSelectedResult(null);
    setSprayPoint(null);
    setRbis(0);
    setStolenBases(0);
  }

  async function handleOpponentOut() {
    if (!gameState) return;
    setStateHistory((prev) => [...prev, gameState]);
    const newState = recordOpponentOut(gameState);
    setGameState(newState);
    await persistState(newState);
  }

  async function handleOpponentRun() {
    if (!gameState) return;
    setStateHistory((prev) => [...prev, gameState]);
    const newState = recordOpponentRun(gameState);
    setGameState(newState);
    await persistState(newState);
  }

  async function handleUndo() {
    if (stateHistory.length === 0 || !gameState) return;
    const prevState = stateHistory[stateHistory.length - 1];
    setStateHistory((prev) => prev.slice(0, -1));
    setGameState(prevState);
    setPlayLog((prev) => prev.slice(0, -1));
    await persistState(prevState);

    const { data: lastPA } = await supabase
      .from("plate_appearances")
      .select("id")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (lastPA) {
      await supabase.from("plate_appearances").delete().eq("id", lastPA.id);
    }
  }

  async function handleEndGame() {
    if (!gameState) return;
    await supabase.from("games").update({
      status: "final",
      our_score: gameState.ourScore,
      opponent_score: gameState.opponentScore,
      innings_played: gameState.currentInning,
    }).eq("id", gameId);
    router.push(`/games/${gameId}`);
  }

  if (loading || !gameState) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  const batter = getCurrentBatter(gameState);
  const isOurBatting = gameState.currentHalf === "bottom";
  const isOpponentBatting = gameState.currentHalf === "top";

  return (
    <div className="space-y-3 max-w-lg mx-auto pb-24">
      {/* Scoreboard — compact for mobile */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-4xl sm:text-5xl font-bold tabular-nums">{gameState.ourScore}</div>
              <div className="text-xs text-muted-foreground mt-1">Us</div>
            </div>
            <div className="text-center px-3">
              {/* Base runners diamond */}
              <svg viewBox="0 0 80 80" className="w-14 h-14 sm:w-16 sm:h-16 mx-auto">
                <line x1="40" y1="65" x2="15" y2="40" stroke="#ccc" strokeWidth="1" />
                <line x1="15" y1="40" x2="40" y2="15" stroke="#ccc" strokeWidth="1" />
                <line x1="40" y1="15" x2="65" y2="40" stroke="#ccc" strokeWidth="1" />
                <line x1="65" y1="40" x2="40" y2="65" stroke="#ccc" strokeWidth="1" />
                <rect x="37" y="62" width="6" height="6" fill="white" stroke="#999" transform="rotate(45 40 65)" />
                <rect x="12" y="37" width="6" height="6" fill={gameState.runnerThird ? "#f59e0b" : "white"} stroke="#999" transform="rotate(45 15 40)" />
                <rect x="37" y="12" width="6" height="6" fill={gameState.runnerSecond ? "#f59e0b" : "white"} stroke="#999" transform="rotate(45 40 15)" />
                <rect x="62" y="37" width="6" height="6" fill={gameState.runnerFirst ? "#f59e0b" : "white"} stroke="#999" transform="rotate(45 65 40)" />
              </svg>
              <div className="text-sm font-semibold mt-1">
                {gameState.currentHalf === "top" ? "\u25B2" : "\u25BC"} {gameState.currentInning}
              </div>
              <div className="flex gap-1.5 mt-1 justify-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full border-2 ${
                      i < gameState.outs ? "bg-red-500 border-red-500" : "bg-transparent border-gray-400"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="text-center flex-1">
              <div className="text-4xl sm:text-5xl font-bold tabular-nums">{gameState.opponentScore}</div>
              <div className="text-xs text-muted-foreground mt-1">Them</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opponent batting (simplified) */}
      {isOpponentBatting && (
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-lg">Opponent Batting</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleOpponentOut}
                variant="outline"
                className="h-16 sm:h-14 text-lg font-semibold active:scale-95 transition-transform"
              >
                Record Out
              </Button>
              <Button
                onClick={handleOpponentRun}
                variant="outline"
                className="h-16 sm:h-14 text-lg font-semibold active:scale-95 transition-transform"
              >
                Run Scored
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Our batting */}
      {isOurBatting && batter && (
        <>
          {/* Current batter */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Now Batting</div>
                <div className="text-2xl sm:text-xl font-bold mt-0.5">{batter.playerName}</div>
              </div>
            </CardContent>
          </Card>

          {/* Result buttons — 3 cols on mobile, 4 on wider screens */}
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-lg">Result</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {RESULT_BUTTONS.map(({ result, label, color }) => (
                  <button
                    key={result}
                    className={`h-14 sm:h-12 rounded-lg text-base font-bold border-2 transition-all active:scale-95 select-none ${
                      selectedResult === result
                        ? `${color} text-white border-transparent`
                        : "bg-background text-foreground border-border hover:bg-accent"
                    }`}
                    onClick={() => setSelectedResult(result)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Spray chart — larger on mobile for thumb accuracy */}
          {selectedResult && !["BB", "SO", "HBP"].includes(selectedResult) && (
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6">
                <CardTitle className="text-lg">Tap where it went</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center px-3 sm:px-6 pb-3">
                <SprayChart
                  onClick={(x, y) => setSprayPoint({ x, y })}
                  selectedPoint={sprayPoint}
                  className="!max-w-[340px] w-full touch-none"
                />
              </CardContent>
            </Card>
          )}

          {/* RBI & SB — larger touch targets */}
          {selectedResult && (
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">RBIs</div>
                    <div className="flex items-center gap-3">
                      <button
                        className="h-12 w-12 rounded-lg border-2 border-border text-xl font-bold flex items-center justify-center active:bg-accent active:scale-95 transition-all select-none"
                        onClick={() => setRbis(Math.max(0, rbis - 1))}
                      >
                        -
                      </button>
                      <span className="text-2xl font-bold w-8 text-center tabular-nums">{rbis}</span>
                      <button
                        className="h-12 w-12 rounded-lg border-2 border-border text-xl font-bold flex items-center justify-center active:bg-accent active:scale-95 transition-all select-none"
                        onClick={() => setRbis(rbis + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Stolen Bases</div>
                    <div className="flex items-center gap-3">
                      <button
                        className="h-12 w-12 rounded-lg border-2 border-border text-xl font-bold flex items-center justify-center active:bg-accent active:scale-95 transition-all select-none"
                        onClick={() => setStolenBases(Math.max(0, stolenBases - 1))}
                      >
                        -
                      </button>
                      <span className="text-2xl font-bold w-8 text-center tabular-nums">{stolenBases}</span>
                      <button
                        className="h-12 w-12 rounded-lg border-2 border-border text-xl font-bold flex items-center justify-center active:bg-accent active:scale-95 transition-all select-none"
                        onClick={() => setStolenBases(stolenBases + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirm button — big and sticky at bottom */}
          {selectedResult && (
            <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur border-t z-40">
              <Button
                onClick={handleConfirmAtBat}
                size="lg"
                className="w-full h-14 text-lg font-bold active:scale-[0.98] transition-transform"
              >
                Confirm:{" "}
                {sprayPoint
                  ? generateNotation(selectedResult, sprayToPosition(sprayPoint.x, sprayPoint.y))
                  : selectedResult}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Action bar */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleUndo}
          disabled={stateHistory.length === 0}
          className="flex-1 h-12 text-base active:scale-95 transition-transform"
        >
          Undo
        </Button>
        <Button
          variant="destructive"
          onClick={handleEndGame}
          className="flex-1 h-12 text-base active:scale-95 transition-transform"
        >
          End Game
        </Button>
      </div>

      {/* Play log */}
      {playLog.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-lg">Play Log</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3">
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {[...playLog].reverse().map((play, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <span>
                    <span className="text-muted-foreground">Inn {play.inning}</span>{" "}
                    <span className="font-medium">{play.playerName}</span>
                  </span>
                  <Badge variant="outline">{play.notation}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
