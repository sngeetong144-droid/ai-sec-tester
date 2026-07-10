/**
 * geo.ts — server-side TARGET geo resolution for the scan-request intake.
 *
 * The requester-side geo (IP country + network type) is resolved in the route
 * via lib/jurisdiction-review's lookupIpCountry / lookupIpNetworkType. This
 * module does the TARGET side: resolve the target hostname's A-record IP, then
 * map that IP to a country — so the sanctions/licence decision runs on the
 * SERVER-resolved target country, never on the client's claimed targetGeo.
 *
 * ponytail: first A-record only, best-effort, fails OPEN (nulls) on any DNS/geo
 * error. A lookup outage must never block a legitimate request — the requester
 * review and the human admin still gate. This is advisory context, not the
 * authorization control. Reuses lookupIpCountry (no parallel geo copy).
 */

import { promises as dns } from "dns";
import { isIP } from "net";
import { lookupIpCountry } from "@/lib/jurisdiction-review";

export interface ResolvedGeo {
  host: string | null;
  ip: string | null;
  country: string | null;
}

const DNS_TIMEOUT_MS = 2500;

async function firstARecord(host: string): Promise<string | null> {
  // dns.resolve4 has no built-in timeout; race it so a slow resolver can't hang
  // the request. ponytail: timeout wins → null → fail open.
  const lookup = dns.resolve4(host).then((ips) => ips[0] ?? null);
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), DNS_TIMEOUT_MS));
  try {
    return await Promise.race([lookup, timeout]);
  } catch {
    return null;
  }
}

/** Resolve a target URL's host → first A-record IP → ISO country. Fails open. */
export async function resolveTargetGeo(target: string): Promise<ResolvedGeo> {
  let host: string | null = null;
  try {
    host = new URL(target).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return { host: null, ip: null, country: null };
  }

  if (process.env.DISABLE_TARGET_GEOLOOKUP === "true") {
    return { host, ip: null, country: null };
  }

  const ip = isIP(host) !== 0 ? host : await firstARecord(host);
  const country = ip ? await lookupIpCountry(ip) : null;
  return { host, ip, country };
}
