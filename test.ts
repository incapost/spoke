import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import { assertWebhookRequest, createSpokeClient } from "./mod.ts";

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

Deno.test("assertWebhookRequest()", async (t) => {
  await t.step("rejects on missing signature", async () => {
    await assertRejects(
      () =>
        assertWebhookRequest(
          WEBHOOK_SECRET_KEY,
          new Request("https://example.com"),
        ),
      TypeError,
      "Missing signature",
    );
  });

  await t.step("rejects on invalid signature", async () => {
    const body = new TextEncoder().encode(JSON.stringify({ hello: "world" }));
    const signature = await signPayload(body);
    const invalidSignature = signature.slice(0, -1) +
      (signature.slice(-1) === "0" ? "1" : "0");

    await assertRejects(
      () =>
        assertWebhookRequest(
          WEBHOOK_SECRET_KEY,
          new Request("https://example.com", {
            method: "POST",
            body: JSON.stringify({ hello: "world" }),
            headers: { "spoke-signature": invalidSignature },
          }),
        ),
      TypeError,
      "Incorrect signature",
    );
  });

  await t.step("passes on valid signature", async () => {
    const body = new TextEncoder().encode(JSON.stringify({ hello: "world" }));
    const signature = await signPayload(body);

    await assertWebhookRequest(
      WEBHOOK_SECRET_KEY,
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
        headers: { "spoke-signature": signature },
      }),
    );
  });
});
