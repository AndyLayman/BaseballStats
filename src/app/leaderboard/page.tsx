"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAvg } from "@/lib/stats/calculations";
import type { BattingStats, FieldingStats } from "@/lib/scoring/types";

type SortKey = keyof BattingStats;

export default function LeaderboardPage() {
  const [battingStats, setBattingStats] = useState<BattingStats[]>([]);
  const [fieldingStats, setFieldingStats] = useState<FieldingStats[]>([]);
  const [sortBy, setSortBy] = useState<SortKey>("avg");
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [battingRes, fieldingRes] = await Promise.all([
        supabase.from("batting_stats_season").select("*"),
        supabase.from("fielding_stats_season").select("*"),
      ]);
      setBattingStats(battingRes.data ?? []);
      setFieldingStats(fieldingRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function handleSort(key: SortKey) {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(false);
    }
  }

  const sortedBatting = [...battingStats]
    .filter((s) => Number(s.at_bats) > 0)
    .sort((a, b) => {
      const aVal = Number(a[sortBy] ?? 0);
      const bVal = Number(b[sortBy] ?? 0);
      return sortAsc ? aVal - bVal : bVal - aVal;
    });

  const sortedFielding = [...fieldingStats]
    .filter((s) => Number(s.total_chances) > 0)
    .sort((a, b) => Number(b.fielding_pct) - Number(a.fielding_pct));

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead
      className="cursor-pointer hover:text-foreground transition-colors select-none px-2 py-3"
      onClick={() => handleSort(field)}
    >
      {label} {sortBy === field ? (sortAsc ? "\u25B2" : "\u25BC") : ""}
    </TableHead>
  );

  // Mobile sort chip buttons
  const SORT_OPTIONS: { label: string; field: SortKey }[] = [
    { label: "AVG", field: "avg" },
    { label: "H", field: "hits" },
    { label: "HR", field: "home_runs" },
    { label: "RBI", field: "rbis" },
    { label: "OPS", field: "ops" },
    { label: "SB", field: "stolen_bases" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>

      <Tabs defaultValue="batting">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="batting" className="flex-1 sm:flex-none">Batting</TabsTrigger>
          <TabsTrigger value="fielding" className="flex-1 sm:flex-none">Fielding</TabsTrigger>
        </TabsList>

        <TabsContent value="batting">
          {sortedBatting.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No batting stats yet</p>
          ) : (
            <>
              {/* Mobile: sort chips + card list */}
              <div className="sm:hidden space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.field}
                      onClick={() => handleSort(opt.field)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors active:scale-95 ${
                        sortBy === opt.field
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-muted-foreground"
                      }`}
                    >
                      {opt.label} {sortBy === opt.field ? (sortAsc ? "\u25B2" : "\u25BC") : ""}
                    </button>
                  ))}
                </div>
                {sortedBatting.map((stat, i) => (
                  <Link key={stat.player_id} href={`/players/${stat.player_id}`}>
                    <Card className="active:scale-[0.99] transition-transform">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                            <span className="font-semibold">{stat.player_name}</span>
                          </div>
                          <span className="text-lg font-bold tabular-nums">
                            {sortBy === "avg" || sortBy === "obp" || sortBy === "slg" || sortBy === "ops"
                              ? formatAvg(Number(stat[sortBy]))
                              : String(stat[sortBy])}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          {[
                            { label: "AVG", value: formatAvg(Number(stat.avg)) },
                            { label: "H", value: stat.hits },
                            { label: "HR", value: stat.home_runs },
                            { label: "RBI", value: stat.rbis },
                          ].map((s) => (
                            <div key={s.label} className="text-xs">
                              <div className="font-bold tabular-nums">{s.value}</div>
                              <div className="text-muted-foreground">{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Desktop: full table */}
              <Card className="hidden sm:block">
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Player</TableHead>
                        <SortHeader label="G" field="games" />
                        <SortHeader label="AB" field="at_bats" />
                        <SortHeader label="H" field="hits" />
                        <SortHeader label="2B" field="doubles" />
                        <SortHeader label="3B" field="triples" />
                        <SortHeader label="HR" field="home_runs" />
                        <SortHeader label="RBI" field="rbis" />
                        <SortHeader label="BB" field="walks" />
                        <SortHeader label="SO" field="strikeouts" />
                        <SortHeader label="SB" field="stolen_bases" />
                        <SortHeader label="AVG" field="avg" />
                        <SortHeader label="OBP" field="obp" />
                        <SortHeader label="SLG" field="slg" />
                        <SortHeader label="OPS" field="ops" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedBatting.map((stat, i) => (
                        <TableRow key={stat.player_id}>
                          <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                          <TableCell>
                            <Link href={`/players/${stat.player_id}`} className="font-medium hover:underline">
                              {stat.player_name}
                            </Link>
                          </TableCell>
                          <TableCell>{stat.games}</TableCell>
                          <TableCell>{stat.at_bats}</TableCell>
                          <TableCell>{stat.hits}</TableCell>
                          <TableCell>{stat.doubles}</TableCell>
                          <TableCell>{stat.triples}</TableCell>
                          <TableCell>{stat.home_runs}</TableCell>
                          <TableCell>{stat.rbis}</TableCell>
                          <TableCell>{stat.walks}</TableCell>
                          <TableCell>{stat.strikeouts}</TableCell>
                          <TableCell>{stat.stolen_bases}</TableCell>
                          <TableCell className="font-bold">{formatAvg(Number(stat.avg))}</TableCell>
                          <TableCell>{formatAvg(Number(stat.obp))}</TableCell>
                          <TableCell>{formatAvg(Number(stat.slg))}</TableCell>
                          <TableCell>{formatAvg(Number(stat.ops))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="fielding">
          {sortedFielding.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No fielding stats yet</p>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="sm:hidden space-y-3">
                {sortedFielding.map((stat, i) => (
                  <Link key={stat.player_id} href={`/players/${stat.player_id}`}>
                    <Card className="active:scale-[0.99] transition-transform">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                            <span className="font-semibold">{stat.player_name}</span>
                          </div>
                          <span className="text-lg font-bold tabular-nums">{Number(stat.fielding_pct).toFixed(3)}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                          <div><div className="font-bold">{stat.putouts}</div><div className="text-muted-foreground">PO</div></div>
                          <div><div className="font-bold">{stat.assists}</div><div className="text-muted-foreground">A</div></div>
                          <div><div className="font-bold">{stat.errors}</div><div className="text-muted-foreground">E</div></div>
                          <div><div className="font-bold">{stat.total_chances}</div><div className="text-muted-foreground">TC</div></div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>

              {/* Desktop: table */}
              <Card className="hidden sm:block">
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>G</TableHead>
                        <TableHead>PO</TableHead>
                        <TableHead>A</TableHead>
                        <TableHead>E</TableHead>
                        <TableHead>TC</TableHead>
                        <TableHead>FLD%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedFielding.map((stat, i) => (
                        <TableRow key={stat.player_id}>
                          <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                          <TableCell>
                            <Link href={`/players/${stat.player_id}`} className="font-medium hover:underline">
                              {stat.player_name}
                            </Link>
                          </TableCell>
                          <TableCell>{stat.games}</TableCell>
                          <TableCell>{stat.putouts}</TableCell>
                          <TableCell>{stat.assists}</TableCell>
                          <TableCell>{stat.errors}</TableCell>
                          <TableCell>{stat.total_chances}</TableCell>
                          <TableCell className="font-bold">{Number(stat.fielding_pct).toFixed(3)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
