import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: invite } = await admin
    .from("team_invites")
    .select("team_id")
    .eq("id", id)
    .single();
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  // Caller must be admin of the invite's team
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", invite.team_id)
    .eq("user_id", user.id)
    .single();
  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "Only admins can cancel invites" }, { status: 403 });
  }

  const { error } = await admin.from("team_invites").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
