// supabase/functions/send-vet-day-reminders/index.ts
//
// Runs every Tuesday via pg_cron + pg_net (same pattern as the existing
// Shelterluv sync). For every animal flagged needs_vet_day, looks up the
// foster's name (from shelterluv_animals.associated_person — adjust the
// column name below if yours differs), matches it against the manually
// maintained `foster_contacts` table to get a phone number, and sends a
// templated reminder text via the Quo API from the team's shared number.
//
// Fosters whose name doesn't match anyone in foster_contacts are collected
// and reported in a single summary text sent to Amber's own phone at the
// end of the run, instead of failing silently or blocking the whole batch.
//
// Required environment variables (set via `supabase secrets set`):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   QUO_API_KEY
//   QUO_FROM_NUMBER   — the shared business number, e.g. "+15551234567"
//   AMBER_PHONE       — where the skipped-foster summary gets texted

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const QUO_API_KEY = Deno.env.get('QUO_API_KEY')!;
const QUO_FROM_NUMBER = Deno.env.get('QUO_FROM_NUMBER')!;
const AMBER_PHONE = Deno.env.get('AMBER_PHONE')!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function normalizeName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function sendQuoText(toNumber, content) {
  const res = await fetch('https://api.quo.com/v1/messages', {
    method: 'POST',
    headers: {
      Authorization: QUO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      from: QUO_FROM_NUMBER,
      to: [toNumber],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Quo send failed (${res.status}): ${body}`);
  }

  return res.json();
}

function vetDayReminderText(fosterName, catName) {
  return `Hi ${fosterName}, this is a reminder that ${catName} has a vet day scheduled this Thursday. Please plan to bring them in — reply here with any questions!`;
}

Deno.serve(async () => {
  try {
    // Pull every animal currently flagged for vet day, joined with the
    // Shelterluv-synced foster name. Adjust `associated_person` below to
    // match your actual column name on shelterluv_animals if different.
    const { data: animals, error: animalsError } = await supabase
      .from('animals')
      .select('id, name:shelterluv_id, shelterluv_id, needs_vet_day')
      .eq('needs_vet_day', true);

    if (animalsError) throw animalsError;

    if (!animals || animals.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0, message: 'No animals flagged for vet day.' }), { status: 200 });
    }

    const shelterluvIds = animals.map(a => a.shelterluv_id).filter(Boolean);

    const { data: shelterluvAnimals, error: shelterluvError } = await supabase
      .from('shelterluv_animals')
      .select('shelterluv_id, name, raw_shelterluv_payload')
      .in('shelterluv_id', shelterluvIds);

    if (shelterluvError) throw shelterluvError;

    // AssociatedPerson lives nested inside the raw Shelterluv JSON payload,
    // e.g. raw_shelterluv_payload.AssociatedPerson.FirstName/.LastName —
    // it isn't its own column, so pull it out here into a plain full name.
    function fosterNameFromPayload(payload) {
      const person = payload?.AssociatedPerson;
      if (!person) return null;
      const full = [person.FirstName, person.LastName].filter(Boolean).join(' ').trim();
      return full || null;
    }

    const shelterluvById = new Map(
      (shelterluvAnimals || []).map(s => [
        s.shelterluv_id,
        { name: s.name, fosterName: fosterNameFromPayload(s.raw_shelterluv_payload) },
      ])
    );

    const { data: fosterContacts, error: contactsError } = await supabase
      .from('foster_contacts')
      .select('name, phone');

    if (contactsError) throw contactsError;

    const contactsByName = new Map(
      (fosterContacts || []).map(c => [normalizeName(c.name), c.phone])
    );

    const sent = [];
    const skipped = [];

    for (const animal of animals) {
      const shelterluvRecord = shelterluvById.get(animal.shelterluv_id);
      const fosterName = shelterluvRecord?.fosterName;
      const catName = shelterluvRecord?.name || 'your foster cat';

      if (!fosterName) {
        skipped.push({ catName, reason: 'No associated foster on file in Shelterluv' });
        continue;
      }

      const phone = contactsByName.get(normalizeName(fosterName));

      if (!phone) {
        skipped.push({ catName, fosterName, reason: 'No matching foster_contacts entry' });
        continue;
      }

      try {
        await sendQuoText(phone, vetDayReminderText(fosterName, catName));
        sent.push({ catName, fosterName, phone });

        // Auto-reset the flag now that the reminder went out successfully,
        // so this same foster doesn't get texted again next Tuesday unless
        // someone re-flags the cat for another vet day.
        const { error: resetError } = await supabase
          .from('animals')
          .update({ needs_vet_day: false })
          .eq('id', animal.id);

        if (resetError) {
          // Don't fail the whole run over this — the text already sent —
          // but surface it in the summary so Amber knows to clear it by hand.
          skipped.push({ catName, fosterName, reason: `Sent, but failed to reset flag: ${resetError.message}` });
        }
      } catch (err) {
        skipped.push({ catName, fosterName, reason: `Send failed: ${err.message}` });
      }
    }

    // Summary text to Amber, only if something needs her attention.
    if (skipped.length > 0) {
      const lines = skipped.map(s =>
        s.fosterName
          ? `- ${s.catName} (foster: ${s.fosterName}) — ${s.reason}`
          : `- ${s.catName} — ${s.reason}`
      );
      const summary = `Vet day reminders: ${sent.length} sent, ${skipped.length} skipped.\n${lines.join('\n')}`;
      await sendQuoText(AMBER_PHONE, summary);
    }

    return new Response(
      JSON.stringify({ sent: sent.length, skipped: skipped.length, details: { sent, skipped } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-vet-day-reminders failed:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
