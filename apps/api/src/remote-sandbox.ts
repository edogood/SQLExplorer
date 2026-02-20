import { createHmac } from "node:crypto";

type ExecutePayload = {
  sessionId: string;
  sql: string;
  params?: unknown[];
  includePlan?: boolean;
  includeProfile?: boolean;
};

export async function forwardExecuteToRemoteSandbox(payload: ExecutePayload) {
  const endpoint = process.env.REMOTE_SANDBOX_EXECUTE_URL;
  const secret = process.env.REMOTE_SANDBOX_HMAC_SECRET;

  if (!endpoint || !secret) {
    throw new Error("Remote sandbox is not configured");
  }

  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SQL-Explorer-Signature": signature
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Remote sandbox error (${response.status}): ${text.slice(0, 512)}`);
  }

  return response.json();
}

