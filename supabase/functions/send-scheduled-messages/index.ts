// Supabase Edge Function: send-scheduled-messages
//
// Triggered on a schedule (via pg_cron, see cron-setup.sql) e.g. every
// 5 minutes. Finds any scheduled_messages rows that are due and fires
// them off through the Quo (OpenPhone) API.
//
// Matches BinxQ's real schema: foster phone lives on foster_families.phone.
//
// Env vars needed (set via `supabase secrets set`):
//   QUO_API_KEY         - from Quo Settings > API
//   QUO_FROM_NUMBER_ID  - the phone number ID (or E.164 number) to send from
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const QUO_API_KEY = Deno.env.get("QUO_API_KEY")!;
const QUO_FROM_NUMBER_ID = Deno.env.get("QUO_FROM_NUMBER_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const QUO_SEND_MESSAGE_URL = "https://api.quo.com/v1/messages";
const MAX_ATTEMPTS = 3;

interface ScheduledMessage {
  id: string;
  animal_id: string;
  foster_id: string;
  message_body: string;
  attempt_count: number;
}

interface FosterFamily {
  phone: string | null;
}

Deno.serve(async (_req) => {
  const now = new Date().toISOString();

  // 1. Pull due, pending messages
  const { data: dueMessages, error: fetchError } = await supabase
    .from("scheduled_messages")
    .select("id, animal_id, foster_id, message_body, attempt_count")
    .eq("status", "pending")
    .lte("send_at", now)
    .lt("attempt_count", MAX_ATTEMPTS)
    .limit(50); // batch size guard

  if (fetchError) {
    console.error("Failed to fetch due messages:", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
    });
  }

  if (!dueMessages || dueMessages.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const results = await Promise.allSettled(
    dueMessages.map((msg) => sendOne(msg as ScheduledMessage)),
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  return new Response(JSON.stringify({ sent, failed, total: results.length }), {
    status: 200,
  });
});

async function sendOne(msg: ScheduledMessage): Promise<void> {
  // Look up the foster family's phone number
  const { data: foster, error: fosterError } = await supabase
    .from("foster_families")
    .select("phone")
    .eq("id", msg.foster_id)
    .single<FosterFamily>();

  if (fosterError || !foster?.phone) {
    await markFailed(msg.id, msg.attempt_count, "Foster phone number not found");
    return;
  }

  try {
    const response = await fetch(QUO_SEND_MESSAGE_URL, {
      method: "POST",
      headers: {
        "Authorization": QUO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: QUO_FROM_NUMBER_ID,
        to: [foster.phone],
        content: msg.message_body,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      await markFailed(msg.id, msg.attempt_count, `Quo API ${response.status}: ${body}`);
      return;
    }

    const data = await response.json();

    await supabase
      .from("scheduled_messages")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        quo_message_id: data.id ?? null,
      })
      .eq("id", msg.id);
  } catch (err) {
    await markFailed(msg.id, msg.attempt_count, String(err));
  }
}

async function markFailed(
  id: string,
  currentAttempts: number,
  reason: string,
): Promise<void> {
  const newAttemptCount = currentAttempts + 1;
  await supabase
    .from("scheduled_messages")
    .update({
      status: newAttemptCount >= MAX_ATTEMPTS ? "failed" : "pending",
      attempt_count: newAttemptCount,
      failure_reason: reason,
    })
    .eq("id", id);
}
