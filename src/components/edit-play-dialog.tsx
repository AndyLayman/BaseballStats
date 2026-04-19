"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BaseRunner, GameState, PlateAppearanceResult, RunnerAdvance } from "@/lib/scoring/types";

const RESULT_OPTIONS: PlateAppearanceResult[] = [
  "1B", "2B", "3B", "HR", "BB", "SO", "GO", "FO", "FC", "DP", "SAC", "HBP", "E", "ROE",
];

type RunnerKey = "first" | "second" | "third";

export interface EditPlayInitial {
  id: string;
  result: PlateAppearanceResult;
  scorebook_notation: string;
  rbis: number;
  runner_advances: RunnerAdvance[] | null;
  /** Runners on base at the moment this play happened (replayed). */
  stateAtPlay: Pick<GameState, "runnerFirst" | "runnerSecond" | "runnerThird"> | null;
}

interface Props {
  open: boolean;
  initial: EditPlayInitial | null;
  loading: boolean;
  onClose: () => void;
  onSave: (updates: {
    result: PlateAppearanceResult;
    scorebook_notation: string;
    rbis: number;
    runner_advances: RunnerAdvance[];
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}

function destinationsFor(base: RunnerKey): RunnerAdvance["to"][] {
  if (base === "first") return ["first", "second", "third", "home", "out"];
  if (base === "second") return ["second", "third", "home", "out"];
  return ["third", "home", "out"];
}

function labelFor(to: RunnerAdvance["to"], base: RunnerKey): string {
  if (to === "first") return "Stays at 1st";
  if (to === "second") return base === "second" ? "Stays at 2nd" : "to 2nd";
  if (to === "third") return base === "third" ? "Stays at 3rd" : "to 3rd";
  if (to === "home") return "Scores";
  return "Out";
}

export function EditPlayDialog({ open, initial, loading, onClose, onSave, onDelete }: Props) {
  const [result, setResult] = useState<PlateAppearanceResult>("1B");
  const [notation, setNotation] = useState("");
  const [rbis, setRbis] = useState(0);
  // Map of source base → destination. Only populated for bases that had a runner.
  const [advances, setAdvances] = useState<Partial<Record<RunnerKey, RunnerAdvance["to"]>>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!initial) return;
    setResult(initial.result);
    setNotation(initial.scorebook_notation);
    setRbis(initial.rbis);

    // Seed advances: prefer the stored override; otherwise default each
    // runner to "stays" so the coach can review and adjust.
    const seed: Partial<Record<RunnerKey, RunnerAdvance["to"]>> = {};
    const onBase: { base: RunnerKey; runner: BaseRunner | null }[] = initial.stateAtPlay
      ? [
          { base: "third", runner: initial.stateAtPlay.runnerThird },
          { base: "second", runner: initial.stateAtPlay.runnerSecond },
          { base: "first", runner: initial.stateAtPlay.runnerFirst },
        ]
      : [];
    for (const { base, runner } of onBase) {
      if (!runner) continue;
      const stored = (initial.runner_advances ?? []).find((a) => a.from === base);
      seed[base] = stored?.to ?? base;
    }
    setAdvances(seed);
  }, [initial]);

  if (!initial) return null;

  const runnersOnBase = initial.stateAtPlay
    ? ([
        ["third", initial.stateAtPlay.runnerThird],
        ["second", initial.stateAtPlay.runnerSecond],
        ["first", initial.stateAtPlay.runnerFirst],
      ] as const).filter(([, r]) => r !== null) as [RunnerKey, BaseRunner][]
    : [];

  const buildAdvancesArray = (): RunnerAdvance[] =>
    runnersOnBase
      .map(([base]) => ({ from: base, to: advances[base] ?? base }))
      // Skip "stays" entries — engine treats absence as "stays."
      .filter((a) => a.to !== a.from);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        result,
        scorebook_notation: notation.trim(),
        rbis,
        runner_advances: buildAdvancesArray(),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this play? Subsequent plays' state will be recomputed.")) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit play</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Result</Label>
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as PlateAppearanceResult)}
                className="mt-1 w-full h-10 rounded-md border border-border/50 bg-input/50 px-2 text-sm"
              >
                {RESULT_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="ep-notation" className="text-xs uppercase tracking-wider text-muted-foreground">Notation</Label>
              <Input
                id="ep-notation"
                value={notation}
                onChange={(e) => setNotation(e.target.value)}
                placeholder="6-3, 1B/L, etc."
              />
            </div>

            <div>
              <Label htmlFor="ep-rbis" className="text-xs uppercase tracking-wider text-muted-foreground">RBIs</Label>
              <Input
                id="ep-rbis"
                type="number"
                min={0}
                max={4}
                value={rbis}
                onChange={(e) => setRbis(Math.max(0, Math.min(4, parseInt(e.target.value) || 0)))}
              />
            </div>

            {runnersOnBase.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Runners</Label>
                {runnersOnBase.map(([base, runner]) => (
                  <div key={base} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      <span className="text-muted-foreground mr-1">{base === "first" ? "1st" : base === "second" ? "2nd" : "3rd"}:</span>
                      {runner.playerName || "Runner"}
                    </span>
                    <select
                      value={advances[base] ?? base}
                      onChange={(e) => setAdvances((prev) => ({ ...prev, [base]: e.target.value as RunnerAdvance["to"] }))}
                      className="h-8 rounded-md border border-border/50 bg-input/50 px-2 text-sm shrink-0"
                    >
                      {destinationsFor(base).map((to) => (
                        <option key={to} value={to}>{labelFor(to, base)}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground pt-1">
              Saving recomputes the rest of this half-inning&apos;s state from this play forward.
            </p>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={loading || saving || deleting}
            onClick={handleDelete}
          >
            {deleting ? "Deleting…" : "Delete play"}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving || deleting}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading || saving || deleting}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
