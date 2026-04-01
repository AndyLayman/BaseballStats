"use client";

import { useCallback } from "react";
import { getResultColor } from "@/lib/scoring/scorebook";
import type { PlateAppearanceResult } from "@/lib/scoring/types";

interface SprayChartProps {
  onClick?: (x: number, y: number) => void;
  markers?: { x: number; y: number; result: PlateAppearanceResult }[];
  selectedPoint?: { x: number; y: number } | null;
  interactive?: boolean;
  className?: string;
}

export function SprayChart({ onClick, markers = [], selectedPoint, interactive = true, className = "" }: SprayChartProps) {
  const getCoords = useCallback((svg: SVGSVGElement, clientX: number, clientY: number) => {
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 300;
    const y = ((clientY - rect.top) / rect.height) * 300;
    return { x, y };
  }, []);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!interactive || !onClick) return;
    const { x, y } = getCoords(e.currentTarget, e.clientX, e.clientY);
    onClick(x, y);
  }

  function handleTouch(e: React.TouchEvent<SVGSVGElement>) {
    if (!interactive || !onClick) return;
    e.preventDefault(); // prevent scroll and double-tap zoom
    const touch = e.changedTouches[0];
    const { x, y } = getCoords(e.currentTarget, touch.clientX, touch.clientY);
    onClick(x, y);
  }

  return (
    <svg
      viewBox="0 0 300 300"
      className={`w-full max-w-[300px] select-none ${interactive ? "cursor-crosshair" : ""} ${className}`}
      onClick={handleClick}
      onTouchEnd={handleTouch}
    >
      {/* Grass */}
      <rect x="0" y="0" width="300" height="300" fill="#2d5016" rx="8" />

      {/* Outfield grass (lighter) */}
      <path d="M 150 280 L 10 120 A 200 200 0 0 1 290 120 Z" fill="#3a6b1e" />

      {/* Infield dirt */}
      <path d="M 150 280 L 80 210 L 150 140 L 220 210 Z" fill="#c4956a" />

      {/* Infield grass (diamond interior) */}
      <path d="M 150 265 L 95 210 L 150 155 L 205 210 Z" fill="#3a6b1e" />

      {/* Foul lines */}
      <line x1="150" y1="280" x2="10" y2="120" stroke="white" strokeWidth="1" opacity="0.6" />
      <line x1="150" y1="280" x2="290" y2="120" stroke="white" strokeWidth="1" opacity="0.6" />

      {/* Outfield fence arc */}
      <path d="M 10 120 A 200 200 0 0 1 290 120" fill="none" stroke="white" strokeWidth="2" opacity="0.5" />

      {/* Base paths */}
      <line x1="150" y1="280" x2="80" y2="210" stroke="white" strokeWidth="1.5" />
      <line x1="80" y1="210" x2="150" y2="140" stroke="white" strokeWidth="1.5" />
      <line x1="150" y1="140" x2="220" y2="210" stroke="white" strokeWidth="1.5" />
      <line x1="220" y1="210" x2="150" y2="280" stroke="white" strokeWidth="1.5" />

      {/* Bases */}
      <rect x="145" y="275" width="10" height="10" fill="white" transform="rotate(45 150 280)" />
      <rect x="75" y="205" width="10" height="10" fill="white" transform="rotate(45 80 210)" />
      <rect x="145" y="135" width="10" height="10" fill="white" transform="rotate(45 150 140)" />
      <rect x="215" y="205" width="10" height="10" fill="white" transform="rotate(45 220 210)" />

      {/* Pitcher's mound */}
      <circle cx="150" cy="220" r="5" fill="#c4956a" stroke="#a07850" strokeWidth="1" />

      {/* Position labels — larger for mobile readability */}
      {[
        { x: 150, y: 228, label: "P" },
        { x: 150, y: 296, label: "C" },
        { x: 235, y: 208, label: "1B" },
        { x: 188, y: 178, label: "2B" },
        { x: 65, y: 208, label: "3B" },
        { x: 112, y: 178, label: "SS" },
        { x: 50, y: 138, label: "LF" },
        { x: 150, y: 95, label: "CF" },
        { x: 250, y: 138, label: "RF" },
      ].map((pos) => (
        <text
          key={pos.label}
          x={pos.x}
          y={pos.y}
          textAnchor="middle"
          fill="white"
          fontSize="11"
          fontWeight="bold"
          opacity="0.6"
        >
          {pos.label}
        </text>
      ))}

      {/* Existing markers */}
      {markers.map((m, i) => (
        <circle
          key={i}
          cx={m.x}
          cy={m.y}
          r="6"
          fill={getResultColor(m.result)}
          stroke="white"
          strokeWidth="1.5"
          opacity="0.85"
        />
      ))}

      {/* Selected point — pulse animation for feedback */}
      {selectedPoint && (
        <>
          <circle
            cx={selectedPoint.x}
            cy={selectedPoint.y}
            r="12"
            fill="#f59e0b"
            opacity="0.3"
          >
            <animate attributeName="r" values="8;14;8" dur="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle
            cx={selectedPoint.x}
            cy={selectedPoint.y}
            r="7"
            fill="#f59e0b"
            stroke="white"
            strokeWidth="2.5"
          />
        </>
      )}
    </svg>
  );
}
