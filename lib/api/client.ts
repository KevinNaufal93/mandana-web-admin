import createClient from "openapi-fetch";
import type { paths } from "@/lib/api/schema";

/** Same StripApiV1 trick as lib/api/server-client.ts — see there for why. */
type StripApiV1<T> = {
  [K in keyof T as K extends `/api/v1${infer Rest}` ? Rest : K]: T[K];
};

type ClientPaths = StripApiV1<paths>;

/**
 * Unauthenticated client, for the handful of endpoints (if any) this app
 * ever needs to call without a session. Most admin data goes through
 * lib/api/server-client.ts's per-request serverApi() instead, which
 * attaches the bearer token — do not add auth handling here.
 */
export const api = createClient<ClientPaths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
});
