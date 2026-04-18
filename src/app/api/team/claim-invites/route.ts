import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Called by AuthProvider after sign-in. Finds any pending invites that
// match the current user's email (case-insensitive), inserts matching
// team_members rows, and deletes the claimed invite rows. Idempotent:
// already-a-member just skips the insert.

export async function POST() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const email = user.email.toLowerCase();

  const admin = getSupabaseAdmin();
  const { data: invites, error: invitesError } = await admin
    .from("team_invites")
    .select("id, team_id, role")
    .eq("email", email);
  if (invitesError) {
    return NextResponse.json({ error: invitesError.message }, { status: 500 });
  }
  if (!invites || invites.length === 0) {
    return NextResponse.json({ claimed: 0 });
  }

  let claimed = 0;
  for (const invite of invites) {
    // Check whether the user is already a member of this team
    const { data: existing } = await admin
      .from("team_members")
      .select("user_id")
      .eq("team_id", invite.team_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await admin.from("team_members").insert({
        team_id: invite.team_id,
        user_id: user.id,
        role: invite.role,
      });
      if (insertError) {
        // Log and skip; don't abort the whole batch
        console.error("[claim-invites] insert failed", insertError);
        continue;
      }
    }

    await admin.from("team_invites").delete().eq("id", invite.id);
    claimed += 1;
  }

  return NextResponse.json({ claimed });
}
