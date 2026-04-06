import type { Player } from "@/lib/scoring/types";

/** Full name: "First Last" */
export function fullName(p: { first_name: string; last_name: string }): string {
  return `${p.first_name} ${p.last_name}`.trim();
}

/** Short name for tight spaces: "First L." */
export function shortName(p: { first_name: string; last_name: string }): string {
  if (!p.last_name) return p.first_name;
  return `${p.first_name} ${p.last_name[0]}.`;
}

/** First name only */
export function firstName(p: { first_name: string; last_name: string }): string {
  return p.first_name;
}

/** "Last, First" for formal/sorted views */
export function lastFirst(p: { first_name: string; last_name: string }): string {
  if (!p.last_name) return p.first_name;
  return `${p.last_name}, ${p.first_name}`;
}
