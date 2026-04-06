"use client";

import { useState } from "react";

const STAT_DEFINITIONS: Record<string, string> = {
  G: "Games Played",
  PA: "Plate Appearances",
  AB: "At Bats",
  H: "Hits",
  "1B": "Singles",
  "2B": "Doubles",
  "3B": "Triples",
  HR: "Home Runs",
  RBI: "Runs Batted In",
  BB: "Walks (Base on Balls)",
  SO: "Strikeouts",
  SB: "Stolen Bases",
  AVG: "Batting Average",
  OBP: "On-Base Percentage",
  SLG: "Slugging Percentage",
  OPS: "On-Base + Slugging",
  PO: "Putouts",
  A: "Assists",
  E: "Errors",
  TC: "Total Chances",
  "FLD%": "Fielding Percentage",
};

export function StatTip({ label, children }: { label: string; children?: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const definition = STAT_DEFINITIONS[label];

  if (!definition) return <>{children ?? label}</>;

  return (
    <span
      className="relative inline-block cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onTouchStart={() => setShow((s) => !s)}
    >
      <span className="border-b border-dotted border-muted-foreground/40">{children ?? label}</span>
      {show && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap z-50 pointer-events-none"
          style={{ fontSize: "11px", lineHeight: "1" }}
        >
          <span className="inline-block px-2 py-1 rounded bg-[#222] text-[#eee] font-medium shadow-md">
            {definition}
          </span>
          <span
            className="absolute top-full left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "4px solid #222",
            }}
          />
        </span>
      )}
    </span>
  );
}
