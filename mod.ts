import createClient from "openapi-fetch";
import type { paths } from "./types.d.ts";

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
 *
 * const { data } = await spokeClient.GET("/plans");
 *
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
