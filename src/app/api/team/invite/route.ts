import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Role = "admin" | "manager" | "teammate" | "parent" | "guest";
const VALID_ROLES: Role[] = ["admin", "manager", "teammate", "parent", "guest"];

async function requireTeamAdmin(teamId: string) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", status: 401 as const };
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();
  if (!membership || membership.role !== "admin") {
    return { error: "Only team admins can manage invites", status: 403 as const };
  }
  return { user };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("team_id");
  if (!teamId) return NextResponse.json({ error: "team_id required" }, { status: 400 });

  const auth = await requireTeamAdmin(teamId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("team_invites")
    .select("id, email, role, created_at")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invites: data ?? [] });
}

export async function POST(request: Request) {
  let body: { email?: string; role?: string; team_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const role = body.role as Role | undefined;
  const teamId = body.team_id;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `role must be one of ${VALID_ROLES.join(", ")}` }, { status: 400 });
  }
  if (!teamId) {
    return NextResponse.json({ error: "team_id required" }, { status: 400 });
  }

  const auth = await requireTeamAdmin(teamId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();

  // If the invitee is already a member of this team, bail out.
  const { data: existingUser } = await admin
    .from("team_members")
    .select("user_id, teams!inner(id)")
    .eq("team_id", teamId);
  // Look up auth user by email to cross-check
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existingAuth = usersPage?.users.find((u) => u.email?.toLowerCase() === email);
  if (existingAuth && existingUser?.some((m) => m.user_id === existingAuth.id)) {
    return NextResponse.json({ error: "User is already on this team" }, { status: 409 });
  }

  // Upsert the pending invite
  const { error: upsertError, data: invite } = await admin
    .from("team_invites")
    .upsert(
      { team_id: teamId, email, role, invited_by: auth.user.id },
      { onConflict: "team_id,email" }
    )
    .select("id, email, role, created_at")
    .single();
  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Send the Supabase magic-link email. If the user already exists in
  // auth.users this still works (Supabase sends a sign-in email). When
  // they follow the link and sign in, AuthProvider will claim the invite.
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { invited_team_id: teamId, invited_role: role },
  });
  if (inviteError) {
    // If it's "already registered" we still keep the pending invite row;
    // the existing user can sign in normally and the claim will fire.
    const msg = inviteError.message || "";
    const alreadyRegistered = /already (registered|exists)|User already/i.test(msg);
    if (!alreadyRegistered) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ invite });
}
