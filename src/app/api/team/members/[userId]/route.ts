import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type Role = "admin" | "manager" | "teammate" | "parent" | "guest";
const VALID_ROLES: Role[] = ["admin", "manager", "teammate", "parent", "guest"];

async function requireAdminForMember(teamId: string) {
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
    return { error: "Only admins can manage members", status: 403 as const };
  }
  return { user };
}

async function countAdmins(teamId: string): Promise<number> {
  const admin = getSupabaseAdmin();
  const { count } = await admin
    .from("team_members")
    .select("user_id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("role", "admin");
  return count ?? 0;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  let body: { team_id?: string; role?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const teamId = body.team_id;
  const role = body.role as Role | undefined;
  if (!teamId) return NextResponse.json({ error: "team_id required" }, { status: 400 });
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }

  const auth = await requireAdminForMember(teamId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Prevent demoting the last admin
  if (role !== "admin") {
    const admin = getSupabaseAdmin();
    const { data: current } = await admin
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .single();
    if (current?.role === "admin") {
      const adminCount = await countAdmins(teamId);
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Can't demote the last admin. Promote someone else first." },
          { status: 400 }
        );
      }
    }
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("team_members")
    .update({ role })
    .eq("team_id", teamId)
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("team_id");
  if (!teamId) return NextResponse.json({ error: "team_id required" }, { status: 400 });

  const auth = await requireAdminForMember(teamId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Prevent removing the last admin
  const admin = getSupabaseAdmin();
  const { data: target } = await admin
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();
  if (target?.role === "admin") {
    const adminCount = await countAdmins(teamId);
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Can't remove the last admin. Promote someone else first." },
        { status: 400 }
      );
    }
  }

  const { error } = await admin
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
