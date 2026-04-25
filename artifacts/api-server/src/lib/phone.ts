/**
 * Normalize a Kenyan phone number to MSISDN format: 2547XXXXXXXX or 2541XXXXXXXX (12 digits, no +).
 * Accepts 07xx, 01xx, +2547xx, 2547xx, with spaces or dashes.
 * Returns null if invalid.
 */
export function normalizeKenyanPhone(input: string): string | null {
  if (!input) return null;
  const cleaned = input.replace(/[^\d+]/g, "");
  let digits = cleaned.replace(/^\+/, "");
  if (digits.startsWith("0")) {
    digits = "254" + digits.slice(1);
  }
  if (digits.length !== 12) return null;
  if (!digits.startsWith("2547") && !digits.startsWith("2541")) return null;
  return digits;
}

export function maskPhone(msisdn: string): string {
  if (!msisdn || msisdn.length < 8) return msisdn;
  return msisdn.slice(0, 6) + "***" + msisdn.slice(-3);
}
