import { supabase, isSupabaseConfigured } from './supabase';

export async function fetchTextRecipients() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('text_recipients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addTextRecipient({ name, phone_number }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const normalizedPhone = normalizePhoneNumber(phone_number);

  const { data, error } = await supabase
    .from('text_recipients')
    .insert({
      name: name || '',
      phone_number: normalizedPhone,
      active: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTextRecipient(id, updates) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const cleanUpdates = { ...updates };

  if (cleanUpdates.phone_number) {
    cleanUpdates.phone_number = normalizePhoneNumber(cleanUpdates.phone_number);
  }

  const { error } = await supabase
    .from('text_recipients')
    .update(cleanUpdates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteTextRecipient(id) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');

  const { error } = await supabase
    .from('text_recipients')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getActiveTextRecipients() {
  const recipients = await fetchTextRecipients();
  return recipients.filter(r => r.active);
}

export function buildLowSupplyMessage(form) {
  return `🚨 LOW SUPPLY ALERT

Item: ${form.item_name}
Amount left: ${form.current_amount || 'Not specified'}
Urgency: ${form.urgency || 'Normal'}
Location: ${form.location || 'Not specified'}
Submitted by: ${form.submitted_by || 'Unknown'}

Notes: ${form.notes || 'None'}`;
}

export function buildAnimalConcernMessage(form) {
  return `⚠️ ANIMAL CONCERN

Animal/Kennel: ${form.animal_or_kennel || 'Not specified'}
Concern: ${form.concern_type || 'Concern'}
Urgency: ${form.urgency || 'Normal'}
Submitted by: ${form.submitted_by || 'Unknown'}

Notes: ${form.notes || 'None'}`;
}

export function buildTextMessage(form) {
  if (form.alert_type === 'Animal Concern') {
    return buildAnimalConcernMessage(form);
  }

  return buildLowSupplyMessage(form);
}

export function buildSmsLink(phoneNumbers, message) {
  const numbers = Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers];
  const cleanNumbers = numbers.filter(Boolean).join(',');
  const encoded = encodeURIComponent(message);

  // iPad/iPhone Messages supports sms:number1,number2?&body=
  // Android often supports sms:number1,number2?body=
  const isApple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);

  if (isApple) {
    return `sms:${cleanNumbers}?&body=${encoded}`;
  }

  return `sms:${cleanNumbers}?body=${encoded}`;
}

export function openMessagesApp(phoneNumbers, message) {
  const recipients = Array.isArray(phoneNumbers)
    ? phoneNumbers
    : String(phoneNumbers || '').split(',');

  const cleaned = recipients
    .flatMap(n => String(n).split(','))
    .map(n => n.replace(/[^\d+]/g, '').trim())
    .filter(Boolean);

  const encoded = encodeURIComponent(message);

  window.location.href = `sms:${cleaned.join(',')}&body=${encoded}`;
}

export function normalizePhoneNumber(raw) {
  const value = String(raw || '').trim();

  if (!value) throw new Error('Phone number is required');

  if (value.startsWith('+')) return value;

  const digits = value.replace(/\D/g, '');

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;

  throw new Error('Enter phone number with area code, like 8285551234 or +18285551234');
}