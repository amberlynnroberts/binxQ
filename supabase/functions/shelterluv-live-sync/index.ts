// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function firstValue(...values: any[]) {
  return values.find(v => v !== undefined && v !== null && v !== "");
}

function extractAnimalArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.animals)) return payload.animals;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.records)) return payload.records;
  if (payload.animals && typeof payload.animals === "object") return Object.values(payload.animals);
  return [];
}

function normalizePhoto(raw: any): string | null {
  const photos = raw.photos || raw.Photos || raw.images || raw.Images || raw.media || raw.Media || [];
  if (Array.isArray(photos) && photos.length > 0) {
    const first = photos[0];
    if (typeof first === "string") return first;
    return first.url || first.Url || first.large || first.medium || first.small || first.original || null;
  }
  return raw.CoverPhoto || raw.coverPhoto || raw.photo_url || raw.photoUrl || raw.PhotoUrl || raw.image || raw.Image || null;
}

function unixToDate(value: any): string | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return new Date(n * 1000).toISOString().slice(0, 10);
}

function normalizeShelterluvAnimal(raw: any) {
  const shelterluv_id = String(firstValue(
    raw.ID, raw.id, raw.shelterluv_id, raw.animal_id, raw.animalId,
    raw.AnimalId, raw.AnimalID, raw["Animal ID"], raw["Internal-ID"],
    raw.InternalID, raw.internal_id
  ));

  const primaryBreed = firstValue(raw.primary_breed, raw.PrimaryBreed, raw.breed, raw.Breed, raw.primaryBreed);
  const primaryColor = firstValue(raw.primary_color, raw.PrimaryColor, raw.color, raw.Color, raw.primaryColor);

  return {
    shelterluv_id,
    name: firstValue(raw.name, raw.Name, raw.animal_name, raw.AnimalName, raw.animalName, "Unnamed"),
    species: firstValue(raw.species, raw.Species, raw.animal_type, raw.AnimalType, raw.type, raw.Type, "Cat"),
    sex: firstValue(raw.sex, raw.Sex, raw.gender, raw.Gender, "Unknown"),
    age: String(firstValue(raw.age, raw.Age, raw.age_group, raw.AgeGroup, raw.ageGroup, "")),
    color: firstValue(raw.color, raw.Color, primaryColor, ""),
    intake_date: firstValue(raw.intake_date, raw.IntakeDate, raw.intakeDate, unixToDate(raw.LastIntakeUnixTime), null),
    status: firstValue(raw.status, raw.Status, raw.current_status, raw.currentStatus, "In Shelter"),
    location: firstValue(
      raw.CurrentLocation?.Tier1,
      raw.location,
      raw.Location,
      null
    ),

    kennel: firstValue(
      raw.CurrentLocation?.Tier2,
      raw.kennel,
      raw.Kennel,
      null
    ),    
    photo_url: normalizePhoto(raw),
    primary_breed: primaryBreed || null,
    secondary_breed: firstValue(raw.secondary_breed, raw.SecondaryBreed, raw.secondaryBreed, null),
    altered: (() => {
      const value = firstValue(raw.altered, raw.Altered, raw.spayed_neutered, raw.SpayedNeutered, raw.spayedNeutered, null);
      if (value === true || value === "Yes" || value === "yes") return true;
      if (value === false || value === "No" || value === "no") return false;
      return null;
    })(),
    primary_color: primaryColor || null,
    secondary_color: firstValue(raw.secondary_color, raw.SecondaryColor, raw.secondaryColor, null),
    size_group: firstValue(raw.size_group, raw.SizeGroup, raw.size, raw.Size, raw.sizeGroup, null),
    current_weight: firstValue(raw.current_weight, raw.CurrentWeight, raw.CurrentWeightPounds, raw.weight, raw.Weight, raw.currentWeight, null),
    age_group: firstValue(raw.age_group, raw.AgeGroup, raw.ageGroup, null),
    estimated_birthdate: firstValue(raw.estimated_birthdate, raw.EstimatedBirthdate, raw.birthdate, raw.Birthdate, raw.estimatedBirthdate, unixToDate(raw.DOBUnixTime), null),
    microchip_number: firstValue(raw.microchip_number, raw.MicrochipNumber, raw.microchip, raw.Microchip, raw.Microchips?.[0], raw.microchipNumber, null),
    website_kennel_card_memo: firstValue(raw.website_kennel_card_memo, raw.WebsiteKennelCardMemo, raw.Description, raw.description, raw.memo, raw.Memo, null),
    adoption_fee_group: firstValue(raw.adoption_fee_group, raw.AdoptionFeeGroup?.Name, raw.AdoptionFeeGroup, null),
    attributes: firstValue(raw.attributes, raw.Attributes, {}),
    photos: firstValue(raw.photos, raw.Photos, raw.images, raw.Images, []),
    raw_shelterluv_payload: raw,
    last_api_sync_at: new Date().toISOString(),
  };
}

function buildShelterluvUrl(endpoint: string, mode: string, body: any) {
  const url = new URL(endpoint);
  url.searchParams.set("sort", body.sort || "updated_at");
  url.searchParams.set("since", String(body.since || "1672531199"));
  url.searchParams.set("limit", String(body.limit || "100"));
  url.searchParams.set("offset", String(body.offset || "0"));

  if (mode === "in_custody" || mode === "quarantine") {
    url.searchParams.set("status_type", "in custody");
  } else if (mode === "archived") {
    url.searchParams.set("status_type", body.status_type || "not in custody");
  }

  if (body.status) url.searchParams.set("status", body.status);
  if (body.status_type) url.searchParams.set("status_type", body.status_type);

  return url.toString();
}

async function fetchShelterluvAnimals(mode: string, body: any) {
  const apiKey = Deno.env.get("SHELTERLUV_API_KEY");
  const endpoint = Deno.env.get("SHELTERLUV_ANIMALS_ENDPOINT");
  if (!apiKey) throw new Error("Missing SHELTERLUV_API_KEY secret");
  if (!endpoint) throw new Error("Missing SHELTERLUV_ANIMALS_ENDPOINT secret");

  const url = buildShelterluvUrl(endpoint, mode, body);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-API-Key": apiKey,
      "Api-Key": apiKey,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Shelterluv API failed: ${response.status} ${text.slice(0, 500)} URL=${url}`);

  try {
    return { payload: JSON.parse(text), url };
  } catch {
    throw new Error(`Shelterluv response was not JSON: ${text.slice(0, 500)} URL=${url}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Use POST" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode || "in_custody";

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
    if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: run, error: runError } = await supabase
      .from("shelterluv_sync_runs")
      .insert({ status: "running" })
      .select()
      .single();
    if (runError) throw runError;

    let animalsSeen = 0;
    let animalsUpserted = 0;
    let preview: any = null;
    let usedUrl = "";

    try {
      const fetched = await fetchShelterluvAnimals(mode, body);
      usedUrl = fetched.url;
      const rawAnimals = extractAnimalArray(fetched.payload);
      animalsSeen = rawAnimals.length;
      preview = { mode, usedUrl, sample: rawAnimals.slice(0, 2) };

      let recordsToSync = rawAnimals;
      if (mode === "quarantine") {
        recordsToSync = rawAnimals.filter((animal) =>
          String(animal.Status || animal.status || "").trim().toLowerCase() === "quarantine - hbcm - not available"
        );
      }

      const normalized = recordsToSync
        .map(normalizeShelterluvAnimal)
        .filter(a => a.shelterluv_id && a.shelterluv_id !== "undefined");

      if (normalized.length) {
        const { error: upsertError } = await supabase
          .from("shelterluv_animals")
          .upsert(normalized, { onConflict: "shelterluv_id" });
        if (upsertError) throw upsertError;
        animalsUpserted = normalized.length;
      }

      const { error: rpcError } = await supabase.rpc("sync_from_shelterluv_api");
      if (rpcError) throw rpcError;

      await supabase.from("shelterluv_sync_runs").update({
        status: "success",
        finished_at: new Date().toISOString(),
        animals_seen: animalsSeen,
        animals_upserted: animalsUpserted,
        raw_response_preview: preview,
      }).eq("id", run.id);

      return new Response(JSON.stringify({ ok: true, mode, used_url: usedUrl, animals_seen: animalsSeen, animals_upserted: animalsUpserted, preview }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      await supabase.from("shelterluv_sync_runs").update({
        status: "failed",
        finished_at: new Date().toISOString(),
        animals_seen: animalsSeen,
        animals_upserted: animalsUpserted,
        error_message: err.message,
        raw_response_preview: preview || { mode, usedUrl },
      }).eq("id", run.id);
      throw err;
    }
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
