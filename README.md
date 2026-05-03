# spoke

[![JSR](https://jsr.io/badges/@incapost/spoke)](https://jsr.io/@incapost/spoke)
[![CI](https://github.com/incapost/spoke/actions/workflows/ci.yml/badge.svg)](https://github.com/incapost/spoke/actions/workflows/ci.yml)

Minimal utilities for working with the
[Spoke REST API](https://developer.dispatch.spoke.com). Includes Spoke API
client and webhook request validation and parsing, both with types. Powered by
[`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/). Compatible with all
JavaScript/TypeScript runtimes and browsers.

```ts ignore
import {
  createSpokeClient,
  getWebhookRequestBodyOrThrow,
} from "@incapost/spoke";

const spokeClient = createSpokeClient("your_spoke_api_key");

// Webhook handler — verifies signature and parses body in one step
async function handleWebhook(request: Request): Promise<Response> {
  try {
    // Step 1 - verify signature and parse body
    const body = await getWebhookRequestBodyOrThrow(
      "your_webhook_secret_key",
      request,
    );
    // body.type narrows body.data
    if (body.type === "stop.allocated") {
      const stop = body.data;
      // E.g. "plans/123/stops/456"
      const [, planId, , stopId] = stop.id.split("/");

      // Step 2 - update the newly allocated stop using the Spoke API client
      const { data } = await spokeClient.POST(
        "/plans/{planId}/stops/{stopId}:liveUpdate",
        {
          params: {
            path: {
              planId,
              stopId,
            },
          },
          body: {
            notes: "Hello, world!",
          },
        },
      );
    }
    return new Response(null, { status: 204 });
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
}
```
