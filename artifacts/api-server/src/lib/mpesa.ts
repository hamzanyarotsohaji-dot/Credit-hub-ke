import { logger } from "./logger";

interface AccessTokenResponse {
  access_token: string;
  expires_in: string;
}

interface StkPushRequest {
  amount: number;
  payerPhone: string; // 2547XXXXXXXX
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
}

export interface StkPushResult {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

function getBaseUrl(): string {
  const env = (process.env.MPESA_ENV ?? "sandbox").toLowerCase();
  return env === "production" || env === "prod" || env === "live"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error("MPESA_CONSUMER_KEY/MPESA_CONSUMER_SECRET not set");
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const url = `${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`M-Pesa token request failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as AccessTokenResponse;
  const expiresIn = parseInt(json.expires_in ?? "3599", 10);
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  return cachedToken.value;
}

function buildTimestamp(d = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export async function stkPush(req: StkPushRequest): Promise<StkPushResult> {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  if (!shortcode || !passkey) {
    throw new Error("MPESA_SHORTCODE/MPESA_PASSKEY not set");
  }

  const token = await getAccessToken();
  const timestamp = buildTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
    "base64",
  );

  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.max(1, Math.round(req.amount)),
    PartyA: req.payerPhone,
    PartyB: shortcode,
    PhoneNumber: req.payerPhone,
    CallBackURL: req.callbackUrl,
    AccountReference: req.accountReference.slice(0, 12),
    TransactionDesc: req.transactionDesc.slice(0, 13),
  };

  const url = `${getBaseUrl()}/mpesa/stkpush/v1/processrequest`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // ignore
  }

  if (!res.ok) {
    logger.error({ status: res.status, body: json }, "M-Pesa STK push failed");
    throw new Error(
      `M-Pesa STK push failed: ${res.status} ${(json["errorMessage"] as string) ?? text}`,
    );
  }

  return json as unknown as StkPushResult;
}

export function getCallbackUrl(reqHost: string | undefined): string {
  if (process.env.MPESA_CALLBACK_URL) return process.env.MPESA_CALLBACK_URL;
  const domains = (process.env.REPLIT_DOMAINS ?? "").split(",").filter(Boolean);
  const domain = domains[0] ?? reqHost;
  if (!domain) {
    throw new Error("Cannot determine M-Pesa callback URL");
  }
  return `https://${domain}/api/mpesa/callback`;
}
