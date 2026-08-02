import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import { createSpokeConnectClient } from "./mod.ts";

Deno.test("createSpokeConnectClient()", async () => {
  const apiKey = "test-api-key";
  using _fetchStub = stub(globalThis, "fetch", (input) => {
    const request = input as Request;
    assertEquals(request.headers.get("Authorization"), `Bearer ${apiKey}`);
    assertEquals(request.url, "https://api.spoke.com/connect/v1/orders");
    return Promise.resolve(new Response("{}"));
  });

  const client = createSpokeConnectClient(apiKey);
  await client.GET("/orders");
});
