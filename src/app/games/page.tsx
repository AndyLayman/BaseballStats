"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Game } from "@/lib/scoring/types";

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Game | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("games").select("*").order("date", { ascending: false });
      const sorted = (data ?? []).sort((a, b) => {
        const aScheduled = a.status === "scheduled" ? 0 : 1;
        const bScheduled = b.status === "scheduled" ? 0 : 1;
        if (aScheduled !== bScheduled) return aScheduled - bScheduled;
        if (a.status === "scheduled" && b.status === "scheduled") {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        const statusOrder: Record<string, number> = { in_progress: 0, final: 1 };
        const aOrder = statusOrder[a.status] ?? 2;
        const bOrder = statusOrder[b.status] ?? 2;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setGames(sorted);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDeleteGame() {
    if (!deleteTarget) return;
    setDeleting(true);
    const gameId = deleteTarget.id;

    // Delete in order: fielding_plays, plate_appearances, game_state, opponent_lineup, game_lineup, then the game
    await supabase.from("fielding_plays").delete().eq("game_id", gameId);
    await supabase.from("plate_appearances").delete().eq("game_id", gameId);
    await supabase.from("game_state").delete().eq("game_id", gameId);
    await supabase.from("opponent_lineup").delete().eq("game_id", gameId);
    await supabase.from("game_lineup").delete().eq("game_id", gameId);
    await supabase.from("games").delete().eq("id", gameId);

    setGames((prev) => prev.filter((g) => g.id !== gameId));
    setDeleteTarget(null);
    setDeleting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient">Games</h1>
        <Link href="/games/new">
          <Button className="glow-primary">New Game</Button>
        </Link>
      </div>

      {games.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No games yet. Create your first game!</p>
      ) : (
        <div className="space-y-3 stagger-children">
          {games.map((game) => (
            <Card key={game.id} className="card-hover glass mb-3">
              <CardContent className="flex items-center justify-between p-4">
                <Link href={`/games/${game.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="text-sm text-muted-foreground w-24 tabular-nums shrink-0">
                    {new Date(game.date + "T00:00:00").toLocaleDateString()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {game.location === "home" ? "vs" : "@"} {game.opponent}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-3 shrink-0">
                  {game.status === "final" ? (
                    <>
                      <span className="text-lg font-bold tabular-nums">
                        {game.our_score} - {game.opponent_score}
                      </span>
                      <Badge
                        variant={game.our_score > game.opponent_score ? "default" : "secondary"}
                        className={game.our_score > game.opponent_score ? "bg-primary/20 text-primary border-primary/30" : ""}
                      >
                        {game.our_score > game.opponent_score ? "W" : game.our_score < game.opponent_score ? "L" : "T"}
                      </Badge>
                    </>
                  ) : game.status === "in_progress" ? (
                    <Badge className="bg-primary/20 text-primary border border-primary/30 animate-pulse">Live</Badge>
                  ) : (
                    <Badge variant="outline" className="border-border/50 text-muted-foreground">Scheduled</Badge>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteTarget(game);
                    }}
                    className="p-2 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Delete game"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" />
                    </svg>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Game</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  Are you sure you want to delete the game against <span className="font-bold">{deleteTarget.opponent}</span> on{" "}
                  <span className="font-bold">{new Date(deleteTarget.date + "T00:00:00").toLocaleDateString()}</span>?
                </p>
                <p className="text-sm text-destructive font-medium">
                  This cannot be undone. All plate appearances, fielding plays, and player stats from this game will be permanently removed.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteGame}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting..." : "Delete Game"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
