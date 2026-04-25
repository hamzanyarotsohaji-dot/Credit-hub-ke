import { logger } from "./logger";

const API_KEY = process.env.AFRICASTALKING_API_KEY ?? "";
const USERNAME = process.env.AFRICASTALKING_USERNAME ?? "";
const IS_SANDBOX = USERNAME === "sandbox";
const BASE_URL = IS_SANDBOX
  ? "https://api.sandbox.africastalking.com"
  : "https://api.africastalking.com";

export interface AirtimeRecipientResponse {
  phoneNumber: string;
  amount: string;
  discount?: string;
  status: string; // "Sent" | "Queued" | "Failed" | etc.
  requestId?: string;
  errorMessage?: string;
}

export interface AirtimeApiResponse {
  numSent: number;
  totalAmount: string;
  totalDiscount?: string;
  responses: AirtimeRecipientResponse[];
  errorMessage?: string;
}

export interface SendAirtimeArgs {
  phoneNumber: string; // 12-digit MSISDN, e.g. "254712345678"
  amount: number; // KSh, integer (AT requires whole numbers)
}

export interface SendAirtimeResult {
  success: boolean;
  status: string;
  requestId?: string;
  errorMessage?: string;
  raw: AirtimeApiResponse;
}

export function isAirtimeConfigured(): boolean {
  return Boolean(API_KEY && USERNAME);
}

/**
 * Send airtime to a Kenyan phone number via Africa's Talking.
 * Throws on transport / auth errors. Returns a result object describing
 * whether AT accepted the request for the recipient.
 */
export async function sendAirtime({
  phoneNumber,
  amount,
}: SendAirtimeArgs): Promise<SendAirtimeResult> {
  if (!isAirtimeConfigured()) {
    throw new Error("Africa's Talking is not configured");
  }
  if (!phoneNumber.startsWith("254") || phoneNumber.length !== 12) {
    throw new Error(`Invalid Kenyan MSISDN: ${phoneNumber}`);
  }
  const whole = Math.floor(amount);
  if (whole < 5 || whole > 10_000) {
    throw new Error(`Airtime amount out of range: ${amount}`);
  }

  const recipients = JSON.stringify([
    { phoneNumber: `+${phoneNumber}`, amount: `KES ${whole}` },
  ]);

  const body = new URLSearchParams({
    username: USERNAME,
    recipients,
  });

  const url = `${BASE_URL}/version1/airtime/send`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apiKey: API_KEY,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const text = await response.text();
  let parsed: AirtimeApiResponse;
  try {
    parsed = JSON.parse(text) as AirtimeApiResponse;
  } catch {
    throw new Error(
      `Africa's Talking returned non-JSON response (${response.status}): ${text.slice(0, 300)}`,
    );
  }

  if (!response.ok) {
    const msg = parsed.errorMessage || `HTTP ${response.status}`;
    throw new Error(`Africa's Talking error: ${msg}`);
  }

  const recipient = parsed.responses?.[0];
  const accepted =
    recipient?.status === "Sent" || recipient?.status === "Queued";

  if (!accepted) {
    logger.warn(
      { phoneNumber, amount: whole, response: parsed },
      "Africa's Talking did not accept airtime delivery",
    );
  }

  return {
    success: accepted,
    status: recipient?.status ?? "Unknown",
    requestId: recipient?.requestId,
    errorMessage: recipient?.errorMessage ?? parsed.errorMessage,
    raw: parsed,
  };
}
