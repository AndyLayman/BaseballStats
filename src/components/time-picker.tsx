"use client";

import { useState, useEffect } from "react";

interface TimePickerProps {
  value: string; // "HH:mm" 24h format or ""
  onChange: (value: string) => void;
}

function parse24(value: string): { hour: number; minute: number; period: "AM" | "PM" } {
  if (!value) return { hour: 12, minute: 0, period: "PM" };
  const [h, m] = value.split(":").map(Number);
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour, minute: m, period };
}

function to24(hour: number, minute: number, period: "AM" | "PM"): string {
  let h = hour;
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${h.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 15, 30, 45];

export function TimePicker({ value, onChange }: TimePickerProps) {
  const parsed = parse24(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState(parsed.period);

  useEffect(() => {
    const p = parse24(value);
    setHour(p.hour);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [value]);

  function update(h: number, m: number, p: "AM" | "PM") {
    onChange(to24(h, m, p));
  }

  const btnBase = "px-3 py-2 rounded-lg text-sm font-medium transition-colors";
  const btnActive = "bg-primary/20 text-primary border border-primary/40";
  const btnInactive = "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50";

  return (
    <div className="space-y-3">
      {/* Hour */}
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Hour</div>
        <div className="flex flex-wrap gap-1.5">
          {HOURS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => { setHour(h); update(h, minute, period); }}
              className={`${btnBase} min-w-[40px] ${hour === h ? btnActive : btnInactive}`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Minute */}
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Minute</div>
        <div className="flex gap-1.5">
          {MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMinute(m); update(hour, m, period); }}
              className={`${btnBase} min-w-[48px] ${minute === m ? btnActive : btnInactive}`}
            >
              :{m.toString().padStart(2, "0")}
            </button>
          ))}
        </div>
      </div>

      {/* AM/PM */}
      <div>
        <div className="flex gap-1.5">
          {(["AM", "PM"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setPeriod(p); update(hour, minute, p); }}
              className={`${btnBase} min-w-[56px] ${period === p ? btnActive : btnInactive}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
