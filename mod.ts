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
type WebhookRequestBodyBase = { version: "v0.2b"; created: number };

export type WebhookRequestBody =
  & WebhookRequestBodyBase
  & (
    | {
      type:
        | "stop.allocated"
        | "stop.out_for_delivery"
        | "stop.attempted_delivery"
        | "stop.departed"
        | "stop.tracking_link_added";
      data: components["schemas"]["stopSchema"];
    }
    | {
      type: "unassigned_stop.tracking_link_added";
      data: components["schemas"]["unassignedStopSchema"];
    }
    | {
      type: "test.send_event";
      data: {
        email: string;
        webhookUrl: string;
      };
    }
  );

/**
 * Verifies a webhook request's signature and returns the parsed body.
 *
 * Combines signature verification and body parsing into a single call. Unlike
 * {@linkcode assertWebhookRequest}, the request body does not need to be read
 * again after calling this function.
 *
 * Note: this function consumes the request body.
 *
 * @throws {TypeError} If the signature header is missing or if the signature is
 * incorrect.
 * @throws {SyntaxError} If the signature header contains characters outside the
 * hex alphabet, or its length is odd.
 *
 * @param webhookSecretKey The webhook secret key used to verify the signature
 * of the request. Generate it at
 * {@link https://dispatch.spoke.com/settings/integrations}.
 * @param request The incoming webhook request to be verified.
 * @returns The parsed {@linkcode WebhookRequestBody}.
 *
 * @see {@link https://developer.dispatch.spoke.com/docs/getting-started/securing-the-endpoint | Securing the Endpoint}
 *
 * @example Usage
 * ```ts
 * import { getWebhookRequestBodyOrThrow } from "@incapost/spoke";
 *
 * async function handleWebhook(request: Request) {
 *   try {
 *     const body = await getWebhookRequestBodyOrThrow("your_webhook_secret_key", request);
 *     // Process body.type and body.data
 *   } catch {
 *     return new Response("Invalid signature", { status: 400 });
 *   }
 * }
 * ```
 */
export async function getWebhookRequestBodyOrThrow(
  webhookSecretKey: string,
  request: Request,
): Promise<WebhookRequestBody> {
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
  const rawBody = await request.bytes();
  const expectedSignature = await crypto.subtle.sign("HMAC", key, rawBody);
  const receivedSignature = Uint8Array.fromHex(signature);
  if (!timingSafeEqual(expectedSignature, receivedSignature)) {
    throw new TypeError("Incorrect signature");
  }

  const rawJson = new TextDecoder().decode(rawBody);
  return JSON.parse(rawJson) as WebhookRequestBody;
}
