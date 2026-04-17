"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { getLeagueConfig, updateLeagueConfig, type LeagueConfig } from "@/lib/league-config";

interface TeamBranding {
  name: string;
  logoSvg: string;
  colorBg: string;
  colorFg: string;
}

export default function SettingsPage() {
  const { activeTeam, refreshMemberships } = useAuth();
  const [config, setConfig] = useState<LeagueConfig | null>(null);
  const [branding, setBranding] = useState<TeamBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeTeam) return;
    const c = await getLeagueConfig(activeTeam.team_id);
    setConfig(c);
    setBranding({
      name: activeTeam.team_name,
      logoSvg: activeTeam.team_logo_svg ?? "",
      colorBg: activeTeam.team_color_bg ?? "#1a1a1a",
      colorFg: activeTeam.team_color_fg ?? "#ffffff",
    });
    setLoading(false);
  }, [activeTeam]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!config || !branding || !activeTeam) return;
    setSaving(true);
    setSaveError(null);
    const cfgOk = await updateLeagueConfig(activeTeam.team_id, config);
    const { error: teamErr } = await supabase
      .from("teams")
      .update({
        name: branding.name.trim() || activeTeam.team_name,
        logo_svg: branding.logoSvg.trim() || null,
        color_bg: branding.colorBg,
        color_fg: branding.colorFg,
      })
      .eq("id", activeTeam.team_id);
    setSaving(false);
    if (cfgOk && !teamErr) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await refreshMemberships();
    } else {
      setSaveError(teamErr?.message ?? "Failed to save settings");
    }
  };

  const update = <K extends keyof LeagueConfig>(key: K, value: LeagueConfig[K]) => {
    setConfig((prev) => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  };

  const updateBranding = <K extends keyof TeamBranding>(key: K, value: TeamBranding[K]) => {
    setBranding((prev) => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  };

  if (loading || !config || !branding) {
    return <div className="py-12 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Team Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="teamName">Team name</Label>
            <Input
              id="teamName"
              value={branding.name}
              onChange={(e) => updateBranding("name", e.target.value)}
              placeholder="Team name"
            />
          </div>

          <div>
            <Label>Team Colors</Label>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Logo</label>
                <input
                  type="color"
                  value={branding.colorFg}
                  onChange={(e) => updateBranding("colorFg", e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border/50 cursor-pointer bg-transparent p-0.5"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">BG</label>
                <input
                  type="color"
                  value={branding.colorBg}
                  onChange={(e) => updateBranding("colorBg", e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border/50 cursor-pointer bg-transparent p-0.5"
                />
              </div>
              {/* Live preview */}
              <div
                className="w-12 h-12 rounded-lg border border-border/50 flex items-center justify-center overflow-hidden shrink-0"
                style={{ backgroundColor: branding.colorBg }}
              >
                {branding.logoSvg.trim() ? (
                  <div
                    className="w-8 h-8 [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: branding.logoSvg }}
                  />
                ) : (
                  <span className="text-lg font-bold" style={{ color: branding.colorFg }}>
                    {branding.name.trim()?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="teamLogoSvg">Logo SVG Code</Label>
            <textarea
              id="teamLogoSvg"
              value={branding.logoSvg}
              onChange={(e) => updateBranding("logoSvg", e.target.value)}
              placeholder='<svg viewBox="0 0 24 24">...</svg>'
              rows={3}
              className="w-full rounded-xl border border-border/50 bg-input/50 px-3 py-2 text-sm font-mono focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-y"
            />
            <p className="text-xs text-muted-foreground">Paste the full &lt;svg&gt; source. Leave empty to show the first letter of your team name instead.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Game Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="maxInnings">Innings per game</Label>
            <Input
              id="maxInnings"
              type="number"
              min={1}
              max={9}
              value={config.maxInnings}
              onChange={(e) => update("maxInnings", parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="battingOrderSize">Batting order size</Label>
            <Input
              id="battingOrderSize"
              type="number"
              min={1}
              max={20}
              value={config.battingOrderSize}
              onChange={(e) => update("battingOrderSize", parseInt(e.target.value) || 9)}
            />
          </div>

          <Toggle
            label="Allow re-entry"
            description="Substituted players can return to the game"
            checked={config.allowReEntry}
            onChange={(v) => update("allowReEntry", v)}
          />

          <Toggle
            label="Continuous batting order"
            description="Entire roster bats in order"
            checked={config.continuousBattingOrder}
            onChange={(v) => update("continuousBattingOrder", v)}
          />

          <Toggle
            label="Extra hitter (EH)"
            description="Allow an additional batting position beyond 9"
            checked={config.extraHitterAllowed}
            onChange={(v) => update("extraHitterAllowed", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mercy Rule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            label="Enabled"
            checked={config.mercyRuleEnabled}
            onChange={(v) => update("mercyRuleEnabled", v)}
          />

          {config.mercyRuleEnabled && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="mercyDiff">Run difference</Label>
                <Input
                  id="mercyDiff"
                  type="number"
                  min={1}
                  value={config.mercyRuleRunDifference}
                  onChange={(e) => update("mercyRuleRunDifference", parseInt(e.target.value) || 10)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mercyAfter">Applies after inning</Label>
                <Input
                  id="mercyAfter"
                  type="number"
                  min={1}
                  max={config.maxInnings}
                  value={config.mercyRuleAfterInning}
                  onChange={(e) => update("mercyRuleAfterInning", parseInt(e.target.value) || 4)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pitch Counts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle
            label="Track pitch counts"
            checked={config.pitchCountEnabled}
            onChange={(v) => update("pitchCountEnabled", v)}
          />

          {config.pitchCountEnabled && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="maxPerGame">Max per game</Label>
                <Input
                  id="maxPerGame"
                  type="number"
                  min={1}
                  value={config.pitchCountMaxPerGame}
                  onChange={(e) => update("pitchCountMaxPerGame", parseInt(e.target.value) || 85)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxPerWeek">Max per week</Label>
                <Input
                  id="maxPerWeek"
                  type="number"
                  min={1}
                  value={config.pitchCountMaxPerWeek}
                  onChange={(e) => update("pitchCountMaxPerWeek", parseInt(e.target.value) || 175)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {saveError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {saveError}
        </div>
      )}

      <Button
        className="w-full"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
      </Button>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center justify-between w-full text-left"
      onClick={() => onChange(!checked)}
    >
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <div
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`}
        />
      </div>
    </button>
  );
}
