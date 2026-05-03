import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  createSpokeClient,
  getWebhookRequestBodyOrThrow,
  type WebhookRequestBody,
} from "./mod.ts";

Deno.test("createSpokeClient()", async () => {
  const apiKey = "test-api-key";
  using _fetchStub = stub(globalThis, "fetch", (input) => {
    const request = input as Request;
    assertEquals(request.headers.get("Authorization"), `Bearer ${apiKey}`);
    assertEquals(request.url, "https://api.getcircuit.com/public/v0.2b/plans");
    return Promise.resolve(new Response("{}"));
  });

  const client = createSpokeClient(apiKey);
  await client.GET("/plans");
});

const WEBHOOK_SECRET_KEY = crypto.randomUUID();

async function signPayload(body: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, body);
  return new Uint8Array(signature).toHex();
}

Deno.test("getWebhookRequestBodyOrThrow()", async (t) => {
  const payload: WebhookRequestBody = {
    type: "test.send_event",
    version: "v0.2b",
    created: 1000000000,
    data: { email: "test@example.com", webhookUrl: "https://example.com/hook" },
  };
  const encodedPayload = new TextEncoder().encode(JSON.stringify(payload));

  await t.step("rejects on missing signature", async () => {
    await assertRejects(
      () =>
        getWebhookRequestBodyOrThrow(
          WEBHOOK_SECRET_KEY,
          new Request("https://example.com"),
        ),
      TypeError,
      "Missing signature header",
    );
  });

  await t.step("rejects on invalid signature", async () => {
    const signature = await signPayload(encodedPayload);
    const invalidSignature = signature.slice(0, -1) +
      (signature.slice(-1) === "0" ? "1" : "0");

    await assertRejects(
      () =>
        getWebhookRequestBodyOrThrow(
          WEBHOOK_SECRET_KEY,
          new Request("https://example.com", {
            method: "POST",
            body: encodedPayload,
            headers: { "spoke-signature": invalidSignature },
          }),
        ),
      TypeError,
      "Incorrect signature",
    );
  });

  await t.step("returns parsed body on valid signature", async () => {
    const signature = await signPayload(encodedPayload);

    const result = await getWebhookRequestBodyOrThrow(
      WEBHOOK_SECRET_KEY,
      new Request("https://example.com", {
        method: "POST",
        body: encodedPayload,
        headers: { "spoke-signature": signature },
      }),
    );

    assertEquals(result, payload);
  });
});
