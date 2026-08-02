import createClient from "openapi-fetch";
import type { paths } from "./types.d.ts";

export * from "./types.d.ts";

const BASE_URL = "https://api.spoke.com/connect/v1";

/**
 * Create a Spoke Connect REST API client.
 *
 * Supports v1 of the Spoke Dispatch API, which is the latest version as of August 2026.
 *
 * @see {@link https://developer.connect.spoke.com | Spoke Dispatch API Documentation}
 * for endpoints and usage details.
 *
 * @example Usage
 * ```ts ignore
 * import { createSpokeDispatchClient } from "@incapost/spoke";
 *
 * const spokeClient = createSpokeDispatchClient("your_spoke_api_key");
 * const { data } = await spokeClient.GET("/orders");
 * // ...
 * ```
 */
export function createSpokeConnectClient(
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
