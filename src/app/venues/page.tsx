"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import type { Venue } from "@/lib/scoring/types";

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVenues();
  }, []);

  async function loadVenues() {
    const { data } = await supabase.from("venues").select("*").order("name");
    setVenues(data ?? []);
    setLoading(false);
  }

  function resetForm() {
    setName("");
    setAddress("");
    setEditingId(null);
    setShowNew(false);
  }

  function startEdit(venue: Venue) {
    setEditingId(venue.id);
    setName(venue.name);
    setAddress(venue.address);
    setShowNew(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    if (editingId) {
      await supabase.from("venues").update({ name: name.trim(), address: address.trim() }).eq("id", editingId);
    } else {
      await supabase.from("venues").insert({ name: name.trim(), address: address.trim() });
    }

    resetForm();
    await loadVenues();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this venue?")) return;
    await supabase.from("venues").delete().eq("id", id);
    setVenues(venues.filter((v) => v.id !== id));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gradient">Saved Venues</h1>
        <Button
          className="h-11 px-5 text-base active:scale-95 transition-transform glow-primary"
          onClick={() => { showNew ? resetForm() : setShowNew(true); }}
        >
          {showNew ? "Cancel" : "Add Venue"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Save your frequently used fields and parks. They&apos;ll appear as quick-select buttons when creating games and practices.
      </p>

      {showNew && (
        <Card className="glass animate-slide-up gradient-border">
          <CardContent className="p-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Poway Sportsplex Field 3"
                className="h-12 text-base bg-input/50 border-border/50 focus:border-primary/50"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Address</label>
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                placeholder="123 Main St, City, State ZIP"
                className="h-12 text-base bg-input/50 border-border/50 focus:border-primary/50"
              />
            </div>
            <Button
              className="w-full h-12 text-base font-bold glow-primary active:scale-[0.98] transition-transform"
              onClick={handleSave}
              disabled={saving || !name.trim()}
            >
              {saving ? "Saving..." : editingId ? "Update Venue" : "Save Venue"}
            </Button>
          </CardContent>
        </Card>
      )}

      {venues.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          No saved venues yet. Add your home field to get started!
        </p>
      ) : (
        <div className="space-y-3 stagger-children">
          {venues.map((venue) => (
            <Card key={venue.id} className="glass">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      <span className="font-semibold text-base">{venue.name}</span>
                    </div>
                    {venue.address && (
                      <div className="text-sm text-muted-foreground mt-0.5 ml-5">{venue.address}</div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {venue.address && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-all"
                        title="Directions"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      </a>
                    )}
                    <button
                      onClick={() => startEdit(venue)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50 transition-all"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(venue.id)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-all"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
