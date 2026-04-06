"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RichEditor } from "@/components/rich-editor";
import type { Practice, PracticeNote, Player } from "@/lib/scoring/types";

const FOCUS_AREAS = ["Hitting", "Fielding", "Throwing", "Baserunning", "Attitude", "Other"];

export default function PracticeDetailPage() {
  const params = useParams();
  const practiceId = params.practiceId as string;

  const [practice, setPractice] = useState<Practice | null>(null);
  const [notes, setNotes] = useState<PracticeNote[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [noteText, setNoteText] = useState("");
  const [focusArea, setFocusArea] = useState<string | null>(null);
  const [teamNotes, setTeamNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [practiceRes, notesRes, playersRes] = await Promise.all([
        supabase.from("practices").select("*").eq("id", practiceId).single(),
        supabase.from("practice_notes").select("*").eq("practice_id", practiceId).order("created_at"),
        supabase.from("players").select("*").order("sort_order"),
      ]);
      setPractice(practiceRes.data);
      setNotes(notesRes.data ?? []);
      setPlayers(playersRes.data ?? []);
      setTeamNotes(practiceRes.data?.notes ?? "");
      setLoading(false);
    }
    load();
  }, [practiceId]);

  function isEmptyHtml(html: string) {
    const stripped = html.replace(/<[^>]*>/g, "").trim();
    return stripped.length === 0;
  }

  async function handleAddNote() {
    if (!selectedPlayer || isEmptyHtml(noteText)) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("practice_notes")
      .insert({
        practice_id: practiceId,
        player_id: selectedPlayer,
        note: noteText.trim(),
        focus_area: focusArea,
      })
      .select()
      .single();
    if (data && !error) {
      setNotes([...notes, data]);
      setNoteText("");
      setFocusArea(null);
      setSelectedPlayer(null);
    }
    setSaving(false);
  }

  async function handleSaveTeamNotes() {
    await supabase.from("practices").update({ notes: teamNotes.trim() || null }).eq("id", practiceId);
  }

  async function handleDeleteNote(noteId: string) {
    await supabase.from("practice_notes").delete().eq("id", noteId);
    setNotes(notes.filter((n) => n.id !== noteId));
  }

  if (loading || !practice) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Group notes by player
  const notesByPlayer = new Map<number, PracticeNote[]>();
  for (const n of notes) {
    const arr = notesByPlayer.get(n.player_id) ?? [];
    arr.push(n);
    notesByPlayer.set(n.player_id, arr);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      <Link href="/practices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Practices
      </Link>

      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gradient">{practice.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date(practice.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Team Notes */}
      <Card className="glass">
        <CardHeader className="pb-2 px-4">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Team Notes</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <RichEditor
            content={teamNotes}
            onChange={(html) => setTeamNotes(html)}
            placeholder="Overall practice notes, drills run, focus for the day..."
          />
          <Button
            variant="outline"
            className="mt-2 h-9 text-xs font-semibold border-border/50"
            onClick={handleSaveTeamNotes}
          >
            Save Notes
          </Button>
        </CardContent>
      </Card>

      {/* Add Player Note */}
      <Card className="glass gradient-border">
        <CardHeader className="pb-2 px-4">
          <CardTitle className="text-sm text-gradient uppercase tracking-wider font-medium">Add Player Note</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Player select */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlayer(selectedPlayer === p.id ? null : p.id)}
                className={`h-10 rounded-xl text-xs font-bold border-2 transition-all active:scale-95 select-none truncate px-1 ${
                  selectedPlayer === p.id
                    ? "bg-primary/20 text-primary border-primary/40 shadow-md"
                    : "bg-muted/30 text-foreground border-border/50"
                }`}
              >
                #{p.number} {p.name.split(" ")[0]}
              </button>
            ))}
          </div>

          {selectedPlayer && (
            <>
              {/* Focus area chips */}
              <div className="flex gap-2 flex-wrap">
                {FOCUS_AREAS.map((area) => (
                  <button
                    key={area}
                    onClick={() => setFocusArea(focusArea === area ? null : area)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all active:scale-95 select-none ${
                      focusArea === area
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "bg-muted/30 text-muted-foreground border-border/50"
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>

              {/* Note input */}
              <RichEditor
                content={noteText}
                onChange={(html) => setNoteText(html)}
                placeholder={`Notes for ${players.find((p) => p.id === selectedPlayer)?.name}...`}
                autofocus
              />

              <Button
                className="w-full h-11 text-sm font-bold glow-primary active:scale-[0.98] transition-transform"
                onClick={handleAddNote}
                disabled={saving || isEmptyHtml(noteText)}
              >
                {saving ? "Saving..." : "Add Note"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Player Notes */}
      {notesByPlayer.size > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gradient">Player Notes</h2>
          {[...notesByPlayer.entries()].map(([pid, playerNotes]) => {
            const player = players.find((p) => p.id === pid);
            return (
              <Card key={pid} className="glass">
                <CardContent className="p-4">
                  <div className="font-semibold text-sm mb-2">
                    #{player?.number} {player?.name}
                  </div>
                  <div className="space-y-2">
                    {playerNotes.map((n) => (
                      <div key={n.id} className="flex items-start gap-2 group">
                        <div className="flex-1">
                          {n.focus_area && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/30 mr-1.5">
                              {n.focus_area}
                            </span>
                          )}
                          <span className="text-sm prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: n.note }} />
                        </div>
                        <button
                          onClick={() => handleDeleteNote(n.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all text-xs shrink-0"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
