import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import { MpesaStkPushBody } from "@workspace/api-zod";
import { db, transactionsTable, bundlesTable } from "@workspace/db";
import { attachUser, requireAuth, type AuthRequest } from "../lib/auth";
import { normalizeKenyanPhone } from "../lib/phone";
import { getCallbackUrl, stkPush } from "../lib/mpesa";
import { sendAirtime, isAirtimeConfigured } from "../lib/africastalking";
import { logger } from "../lib/logger";

interface BundleRow {
  id: number;
  type: string;
  amount: string;
  sellingPrice: string;
}

/**
 * Deliver airtime for a paid transaction. Updates the transaction row to
 * `completed` on success or `failed` on delivery error. Always swallows
 * errors so the M-Pesa callback handler stays resilient.
 */
async function deliverAirtimeForTransaction(args: {
  txId: number;
  recipientPhone: string;
  bundle: BundleRow;
}): Promise<void> {
  const { txId, recipientPhone, bundle } = args;

  if (!isAirtimeConfigured()) {
    logger.warn(
      { txId },
      "Africa's Talking not configured; leaving transaction as 'paid'",
    );
    return;
  }

  // For airtime bundles, send the face value (e.g. KSh 50). For data/SMS
  // bundles AT cannot deliver the bundle directly via this API, so we send
  // airtime equivalent to what the user paid.
  let airtimeAmount = Number(bundle.sellingPrice);
  if (bundle.type === "airtime") {
    const parsed = Number(bundle.amount);
    if (Number.isFinite(parsed) && parsed > 0) airtimeAmount = parsed;
  }
  if (!Number.isFinite(airtimeAmount) || airtimeAmount <= 0) {
    logger.warn({ txId, bundle }, "Invalid airtime amount; skipping delivery");
    return;
  }

  try {
    const result = await sendAirtime({
      phoneNumber: recipientPhone,
      amount: airtimeAmount,
    });

    if (result.success) {
      await db
        .update(transactionsTable)
        .set({
          status: "completed",
          resultDesc: `Airtime ${result.status} (req ${result.requestId ?? "n/a"})`,
          updatedAt: new Date(),
        })
        .where(eq(transactionsTable.id, txId));
      logger.info(
        { txId, recipientPhone, airtimeAmount, requestId: result.requestId },
        "Airtime delivered",
      );
    } else {
      await db
        .update(transactionsTable)
        .set({
          status: "failed",
          resultDesc:
            (result.errorMessage ?? `Airtime ${result.status}`).slice(0, 200),
          updatedAt: new Date(),
        })
        .where(eq(transactionsTable.id, txId));
      logger.warn(
        { txId, status: result.status, error: result.errorMessage },
        "Airtime delivery rejected by Africa's Talking",
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Airtime send failed";
    await db
      .update(transactionsTable)
      .set({
        status: "failed",
        resultDesc: `Airtime delivery error: ${message}`.slice(0, 200),
        updatedAt: new Date(),
      })
      .where(eq(transactionsTable.id, txId));
    logger.error({ err, txId }, "Airtime delivery threw");
  }
}

const router: IRouter = Router();

router.post(
  "/mpesa/stkpush",
  attachUser,
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const parsed = MpesaStkPushBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const recipient = normalizeKenyanPhone(parsed.data.recipientPhone);
    const payer = normalizeKenyanPhone(parsed.data.payerPhone);
    if (!recipient || !payer) {
      res.status(400).json({ error: "Invalid phone numbers" });
      return;
    }

    const [bundle] = await db
      .select()
      .from(bundlesTable)
      .where(eq(bundlesTable.id, parsed.data.bundleId))
      .limit(1);

    if (!bundle || !bundle.active) {
      res.status(404).json({ error: "Bundle not found" });
      return;
    }

    const userId = req.authUser!.id;
    const amount = Number(bundle.sellingPrice);

    const inserted = await db
      .insert(transactionsTable)
      .values({
        userId,
        bundleId: bundle.id,
        recipientPhone: recipient,
        payerPhone: payer,
        amount: bundle.sellingPrice,
        status: "pending",
      })
      .returning();
    const tx = inserted[0]!;

    try {
      const callbackUrl = getCallbackUrl(req.get("host") ?? undefined);
      const stk = await stkPush({
        amount,
        payerPhone: payer,
        accountReference: `CH${tx.id}`,
        transactionDesc: `Bundle ${bundle.id}`,
        callbackUrl,
      });

      await db
        .update(transactionsTable)
        .set({
          merchantRequestId: stk.MerchantRequestID,
          checkoutRequestId: stk.CheckoutRequestID,
          updatedAt: new Date(),
        })
        .where(eq(transactionsTable.id, tx.id));

      res.json({
        success: true,
        transactionId: tx.id,
        merchantRequestId: stk.MerchantRequestID,
        checkoutRequestId: stk.CheckoutRequestID,
        customerMessage: stk.CustomerMessage,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "STK push failed";
      req.log.error({ err: message }, "M-Pesa STK push failed");
      await db
        .update(transactionsTable)
        .set({
          status: "failed",
          resultDesc: message.slice(0, 200),
          updatedAt: new Date(),
        })
        .where(eq(transactionsTable.id, tx.id));
      res.status(502).json({ error: "M-Pesa request failed", detail: message });
    }
  },
);

interface MpesaCallbackItem {
  Name: string;
  Value?: string | number;
}

router.post("/mpesa/callback", async (req, res) => {
  // Always ack first so Safaricom doesn't retry
  res.json({ success: true });

  try {
    const body = req.body as Record<string, unknown>;
    const cb = (body?.["Body"] as Record<string, unknown> | undefined)?.[
      "stkCallback"
    ] as Record<string, unknown> | undefined;
    if (!cb) return;

    const checkoutId = cb["CheckoutRequestID"] as string | undefined;
    const resultCode = cb["ResultCode"] as number | undefined;
    const resultDesc = (cb["ResultDesc"] as string | undefined) ?? null;

    if (!checkoutId) return;

    const [tx] = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.checkoutRequestId, checkoutId))
      .limit(1);
    if (!tx) {
      req.log.warn({ checkoutId }, "Callback for unknown transaction");
      return;
    }

    if (resultCode === 0) {
      const meta = (cb["CallbackMetadata"] as
        | { Item?: MpesaCallbackItem[] }
        | undefined)?.Item ?? [];
      const receipt = meta.find((i) => i.Name === "MpesaReceiptNumber")
        ?.Value as string | undefined;
      await db
        .update(transactionsTable)
        .set({
          status: "paid",
          mpesaCode: receipt ?? null,
          resultDesc,
          updatedAt: new Date(),
        })
        .where(eq(transactionsTable.id, tx.id));
      req.log.info({ txId: tx.id, receipt }, "Transaction paid");

      // Look up the bundle and trigger airtime delivery via Africa's Talking.
      const [bundle] = await db
        .select({
          id: bundlesTable.id,
          type: bundlesTable.type,
          amount: bundlesTable.amount,
          sellingPrice: bundlesTable.sellingPrice,
        })
        .from(bundlesTable)
        .where(eq(bundlesTable.id, tx.bundleId))
        .limit(1);

      if (bundle) {
        await deliverAirtimeForTransaction({
          txId: tx.id,
          recipientPhone: tx.recipientPhone,
          bundle,
        });
      } else {
        req.log.warn(
          { txId: tx.id, bundleId: tx.bundleId },
          "Bundle missing at airtime delivery time",
        );
      }
    } else {
      await db
        .update(transactionsTable)
        .set({
          status: "failed",
          resultDesc,
          updatedAt: new Date(),
        })
        .where(eq(transactionsTable.id, tx.id));
      req.log.info(
        { txId: tx.id, resultCode, resultDesc },
        "Transaction failed",
      );
    }
  } catch (err) {
    req.log.error({ err }, "Error processing M-Pesa callback");
  }
});

export default router;
