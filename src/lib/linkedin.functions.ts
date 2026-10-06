import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ProfilePayload, Result } from "./linkedin/types";
import { ScrapeError, scrape, testSession } from "./linkedin/scraper.server";

const opts = {
  cookie: z.string().max(20000),
  timeoutSec: z.number().min(5).max(60).default(20),
};

function fail(e: unknown): Result<never> {
  if (e instanceof ScrapeError) return { ok: false, code: e.code, message: e.message };
  // Never log or echo raw errors: they could contain request data.
  console.error("scrape: unexpected error", e instanceof Error ? e.name : "unknown");
  return { ok: false, code: "internal_error", message: "Unexpected server error" };
}

export const scrapeProfile = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ url: z.string().max(2048), useCache: z.boolean().default(true), ...opts }).parse(d),
  )
  .handler(async ({ data }): Promise<Result<ProfilePayload>> => {
    try {
      const value = await scrape({
        url: data.url,
        cookie: data.cookie,
        timeoutMs: data.timeoutSec * 1000,
        useCache: data.useCache,
      });
      return { ok: true, value };
    } catch (e) {
      return fail(e);
    }
  });

export const testConnection = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object(opts).parse(d))
  .handler(async ({ data }): Promise<Result<{ checkedAt: string }>> => {
    try {
      await testSession(data.cookie, data.timeoutSec * 1000);
      return { ok: true, value: { checkedAt: new Date().toISOString() } };
    } catch (e) {
      return fail(e);
    }
  });

export const health = createServerFn({ method: "GET" }).handler(async () => ({
  status: "ok" as const,
  time: new Date().toISOString(),
}));
