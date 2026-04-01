"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Player } from "@/lib/scoring/types";

export default function NewGamePage() {
  const router = useRouter();
  const [opponent, setOpponent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState<"home" | "away">("home");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("players").select("*").order("sort_order");
      const allPlayers = data ?? [];
      setPlayers(allPlayers);
      setSelectedPlayers(allPlayers.map((p) => p.id));
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!opponent.trim() || selectedPlayers.length === 0) return;

    setSaving(true);

    // Create the game
    const { data: game, error } = await supabase
      .from("games")
      .insert({ opponent: opponent.trim(), date, location, status: "scheduled" })
      .select()
      .single();

    if (error || !game) {
      alert("Failed to create game: " + (error?.message ?? "Unknown error"));
      setSaving(false);
      return;
    }

    // Create lineup entries
    const lineupRows = selectedPlayers.map((playerId, idx) => ({
      game_id: game.id,
      player_id: playerId,
      batting_order: idx + 1,
      position: "",
    }));

    await supabase.from("game_lineup").insert(lineupRows);

    // Create game state
    await supabase.from("game_state").insert({
      game_id: game.id,
      current_inning: 1,
      current_half: "top",
      outs: 0,
      current_batter_index: 0,
    });

    router.push(`/games/${game.id}`);
  }

  function togglePlayer(playerId: number) {
    setSelectedPlayers((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  }

  function movePlayer(playerId: number, direction: "up" | "down") {
    setSelectedPlayers((prev) => {
      const idx = prev.indexOf(playerId);
      if (idx === -1) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">New Game</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Game Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="opponent">Opponent</Label>
              <Input
                id="opponent"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Team name"
                required
                className="h-12 text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12 text-base" />
              </div>
              <div>
                <Label>Location</Label>
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant={location === "home" ? "default" : "outline"}
                    onClick={() => setLocation("home")}
                    className="flex-1 h-12 text-base active:scale-95 transition-transform"
                  >
                    Home
                  </Button>
                  <Button
                    type="button"
                    variant={location === "away" ? "default" : "outline"}
                    onClick={() => setLocation("away")}
                    className="flex-1 h-12 text-base active:scale-95 transition-transform"
                  >
                    Away
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Batting Order</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Select players and arrange the batting order. Use arrows to reorder.
            </p>
            <div className="space-y-2">
              {players.map((player) => {
                const isSelected = selectedPlayers.includes(player.id);
                const orderIdx = selectedPlayers.indexOf(player.id);
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      isSelected ? "bg-accent" : ""
                    }`}
                    onClick={() => togglePlayer(player.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-5 w-5 pointer-events-none"
                    />
                    {isSelected && (
                      <span className="text-sm font-bold text-muted-foreground w-5">{orderIdx + 1}</span>
                    )}
                    <span className="font-medium flex-1 text-base">
                      #{player.number} {player.name}
                    </span>
                    {isSelected && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="h-10 w-10 flex items-center justify-center rounded-lg border text-lg active:bg-accent active:scale-95 transition-all disabled:opacity-30"
                          onClick={() => movePlayer(player.id, "up")}
                          disabled={orderIdx === 0}
                        >
                          &uarr;
                        </button>
                        <button
                          type="button"
                          className="h-10 w-10 flex items-center justify-center rounded-lg border text-lg active:bg-accent active:scale-95 transition-all disabled:opacity-30"
                          onClick={() => movePlayer(player.id, "down")}
                          disabled={orderIdx === selectedPlayers.length - 1}
                        >
                          &darr;
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={saving || !opponent.trim() || selectedPlayers.length === 0}>
          {saving ? "Creating..." : "Create Game"}
        </Button>
      </form>
    </div>
  );
}
