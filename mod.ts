import createClient from "openapi-fetch";
import { timingSafeEqual } from "@std/crypto/timing-safe-equal";
import type { components, paths } from "./types.d.ts";

export * from "./types.d.ts";

const BASE_URL = "https://api.getcircuit.com/public/v0.2b";

/**
 * Create a Spoke REST API client.
 *
 * Supports version 0.2b of the Spoke API, which is the latest version as of May
 * 2023.
 *
 * @see {@link https://developer.dispatch.spoke.com | Spoke API Documentation}
 * for endpoints and usage details.
 *
 * @example Usage
 * ```ts ignore
 * import { createSpokeClient } from "@incapost/spoke";
 *
 * const spokeClient = createSpokeClient("your_spoke_api_key");
 * const { data } = await spokeClient.GET("/plans");
 * // ...
 * ```
 *
 * @param apiKey Spoke REST API key. Generate one at {@link https://dispatch.spoke.com/settings/integrations}.
 * @returns Spoke REST API client
 */
export function createSpokeClient(
  apiKey: string,
): ReturnType<typeof createClient<paths>> {
  const spokeClient = createClient<paths>({
    baseUrl: BASE_URL,
  });
  spokeClient.use({
    onRequest({ request }) {
      request.headers.set("Authorization", `Bearer ${apiKey}`);
      return request;
    },
  });
  return spokeClient;
}

// Until Spoke publishes this definition
export interface WebhookRequestBody {
  type:
    | "stop.allocated"
    | "stop.out_for_delivery"
    | "stop.attempted_delivery"
    | "test.send_event";
  version: "v0.2b";
  created: number;
  data: components["schemas"]["stopSchema"];
}

/**
 * Asserts that a webhook request is valid by verifying its signature using the
 * provided webhook secret key.
 *
 * @throws {TypeError} If the signature header is missing or if the signature is
 * incorrect.
 *
 * @param webhookSecretKey The webhook secret key used to verify the signature
 * of the request. Generate it at
 * {@link https://dispatch.spoke.com/settings/integrations}.
 * @param request The incoming webhook request to be verified.
 *
 * @see {@link https://developer.dispatch.spoke.com/docs/getting-started/securing-the-endpoint | Securing the Endpoint}
 *
 * @example Usage
 * ```ts
 * import { assertWebhookRequest, type WebhookRequestBody } from "@incapost/spoke";
 *
 * async function handleWebhook(request: Request) {
 *   try {
 *     await assertWebhookRequest("your_webhook_secret_key", request);
 *     const body = (await request.json()) as WebhookRequestBody;
 *     // Process the webhook request
 *   } catch (error) {
 *     return new Response("Invalid signature", { status: 400 });
 *   }
 * }
 * ```
 */
export async function assertWebhookRequest(
  webhookSecretKey: string,
  request: Request,
) {
  const signature = request.headers.get("spoke-signature");
  if (!signature) {
    throw new TypeError("Missing signature header");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const body = await request.clone().arrayBuffer();
  const expected = await crypto.subtle.sign("HMAC", key, body);
  const received = Uint8Array.fromHex(signature);
  if (!timingSafeEqual(expected, received)) {
    throw new TypeError("Incorrect signature");
  }
}
