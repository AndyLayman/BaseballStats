import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("team_id");
  if (!teamId) return NextResponse.json({ error: "team_id required" }, { status: 400 });

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Must be a member of the team to list members
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();
  if (!membership) return NextResponse.json({ error: "Not a member of this team" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const { data: members, error } = await admin
    .from("team_members")
    .select("user_id, role, player_id")
    .eq("team_id", teamId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach email from auth.users (service-role only)
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const byId = new Map(usersPage?.users.map((u) => [u.id, u.email ?? ""]));
  const enriched = (members ?? []).map((m) => ({
    user_id: m.user_id,
    role: m.role,
    player_id: m.player_id,
    email: byId.get(m.user_id) ?? "",
    is_self: m.user_id === user.id,
  }));
  return NextResponse.json({ members: enriched });
}
