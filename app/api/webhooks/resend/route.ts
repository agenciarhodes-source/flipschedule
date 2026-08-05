import { NextResponse, type NextRequest } from "next/server";

import { structuredLog } from "@/lib/observability/logger";
import {
  processResendWebhook,
  ResendWebhookError,
  verifyResendWebhook,
} from "@/lib/email/resend-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BYTES = 256 * 1024;

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return NextResponse.json({ error: "Request rejected" }, { status: 415 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Request rejected" }, { status: 413 });
  }

  const payload = await request.text();
  if (Buffer.byteLength(payload, "utf8") > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Request rejected" }, { status: 413 });
  }

  const providerEventId = request.headers.get("svix-id");
  try {
    const event = verifyResendWebhook(payload, {
      id: providerEventId,
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    });
    const result = await processResendWebhook(event, providerEventId!);
    return NextResponse.json({ accepted: true, duplicate: result.duplicate }, { status: 200 });
  } catch (error) {
    if (error instanceof ResendWebhookError) {
      structuredLog("warn", "email.webhook.rejected", {
        provider: "resend",
        errorCode: error.code,
      });
      const status = error.code === "WEBHOOK_CONFIGURATION_INVALID" ? 503 : 400;
      return NextResponse.json({ error: "Request rejected" }, { status });
    }
    structuredLog("error", "email.webhook.failed", {
      provider: "resend",
      errorCode: "WEBHOOK_PROCESSING_FAILED",
    });
    return NextResponse.json({ error: "Request rejected" }, { status: 500 });
  }
}
