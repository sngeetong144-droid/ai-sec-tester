export type RestrictedJurisdictionCode = "SG" | "MY";

export type Confidence = "high" | "med" | "low";

export interface RestrictedJurisdiction {
  code: RestrictedJurisdictionCode;
  name: string;
  tlds: string[];
  regulator: string;
  restriction: string;
  /** Statute that imposes the licensing requirement. */
  law?: string;
  /** Primary regulator/source URL backing this entry. */
  sourceUrl?: string;
  /** ISO date this citation was last checked against the source. */
  lastReviewed?: string;
  /** How confident we are the entry is accurate and current. */
  confidence?: Confidence;
}

// NOTE: licence-required jurisdictions FLAG FOR MANUAL ADMIN REVIEW (hold) — they
// are NEVER auto-rejected. Only comprehensive-sanctions matches auto-reject.
// This is not legal advice; see JURISDICTION_POLICY.needsLegalReview.
export const LICENSE_RESTRICTED_JURISDICTIONS: RestrictedJurisdiction[] = [
  {
    code: "SG",
    name: "Singapore",
    tlds: [".sg"],
    regulator:
      "Cyber Security Agency of Singapore (CSA) / Cybersecurity Services Regulation Office (CSRO)",
    restriction:
      "penetration testing is a licensable cybersecurity service; providing it without a CSA licence is an offence (since 11 Oct 2022) under the Cybersecurity Act 2018",
    law: "Cybersecurity Act 2018 (Part 5 — licensing of cybersecurity service providers)",
    sourceUrl: "https://www.csa.gov.sg/legislation/cybersecurity-act/",
    lastReviewed: "2026-07-11",
    confidence: "high",
  },
  {
    code: "MY",
    name: "Malaysia",
    tlds: [".my"],
    regulator: "National Cyber Security Agency Malaysia (NACSA)",
    restriction:
      "penetration testing is a prescribed cybersecurity service requiring a NACSA licence; unlicensed provision is an offence under the Cyber Security Act 2024 (Act 854)",
    law: "Cyber Security Act 2024 (Act 854), gazetted 26 Jun 2024; licensing from 1 Oct 2024",
    sourceUrl: "https://licence.nacsa.gov.my/",
    lastReviewed: "2026-07-11",
    confidence: "high",
  },
];

export const RESTRICTED_JURISDICTION_CODES = new Set(
  LICENSE_RESTRICTED_JURISDICTIONS.map((j) => j.code),
);

export function getRestrictedTargetMessage(
  jurisdiction: RestrictedJurisdiction,
): string {
  return `Target jurisdiction is restricted: ${jurisdiction.name}. AI Sec Tester does not currently provide penetration-testing services for ${jurisdiction.name}-hosted or ${jurisdiction.name}-scoped targets because ${jurisdiction.restriction}. Use a properly licensed provider through ${jurisdiction.regulator}, or request a non-invasive policy/compliance review only.`;
}

function findByHostname(hostname: string): RestrictedJurisdiction | null {
  const h = hostname.toLowerCase();
  for (const jurisdiction of LICENSE_RESTRICTED_JURISDICTIONS) {
    if (jurisdiction.tlds.some((tld) => h === tld.slice(1) || h.endsWith(tld))) {
      return jurisdiction;
    }
  }
  return null;
}

function findByCountryCode(code: string | null): RestrictedJurisdiction | null {
  if (!code) return null;
  return (
    LICENSE_RESTRICTED_JURISDICTIONS.find(
      (j) => j.code === code.toUpperCase(),
    ) ?? null
  );
}

export async function assertJurisdictionAllowed(
  hostname: string,
  ips: string[],
  lookupCountryCode: (ip: string) => Promise<string | null>,
): Promise<void> {
  const hostnameJurisdiction = findByHostname(hostname);
  if (hostnameJurisdiction) {
    throw new Error(getRestrictedTargetMessage(hostnameJurisdiction));
  }

  for (const ip of ips) {
    const country = await lookupCountryCode(ip);
    const ipJurisdiction = findByCountryCode(country);
    if (ipJurisdiction) {
      throw new Error(getRestrictedTargetMessage(ipJurisdiction));
    }
  }
}

export const JURISDICTION_NOTICE =
  "Singapore- and Malaysia-hosted/scoped targets are restricted for penetration-testing services unless handled through the required licensed provider path. Other public-sector, critical-infrastructure, sanctioned, or regulated targets require manual legal review before any paid security work.";

// ── OFAC / sanctions deny-list (shared) ────────────────────────────────────────
//
// Canonical requester-jurisdiction sanctions set, lifted out of
// app/_components/compliance-gate.tsx so the client gate and the server-side
// scan-request review use ONE list. ponytail: static set, not a live OFAC/SDN
// feed — swap for a real data source when compliance funds one.
// (lib/scan-gate.ts keeps its own narrower SANCTIONED_COUNTRY_CODES for the
// TARGET activation sub-check; that is a different axis and intentionally strict.)
export const OFAC_BLOCKED_COUNTRY_CODES: ReadonlySet<string> = new Set([
  "CU", "IR", "KP", "RU", "SY", "BY", "VE", "MM", "SD", "SS", "YE", "ZW",
  "AF", "LY", "ML", "NI", "SO",
]);

export function isSanctionedCountry(code: string | null | undefined): boolean {
  if (!code) return false;
  return OFAC_BLOCKED_COUNTRY_CODES.has(code.trim().toUpperCase());
}

// ── Sanctions citations (per-country provenance for counsel) ───────────────────
//
// This is NOT legal advice and NOT a live SDN feed. It records WHY each code in
// OFAC_BLOCKED_COUNTRY_CODES is on the auto-reject list, with a source and review
// date, so counsel can audit the list. `comprehensive: true` marks the current
// OFAC *comprehensive-embargo* countries (whole-country prohibition). The rest are
// targeted/sectoral programs kept on the auto-reject set as a CONSERVATIVE default
// for a security-testing business — over-rejecting a sanctioned-adjacent country
// is the safe failure; under-rejecting is not.
//
// Current comprehensive country-level embargoes (July 2026): Cuba, Iran, North
// Korea. (Syria's comprehensive program was REVOKED by EO 14312 on 30 Jun 2025 and
// the SySR removed from the CFR by Aug 2025; targeted sanctions on specific Syrian
// actors remain, so SY is retained on the conservative auto-reject set, not the
// comprehensive set.) Crimea / Donetsk / Luhansk are comprehensively embargoed
// REGIONS, not countries, so they have no ISO-3166 country code here.
export interface SanctionCitation {
  code: string;
  name: string;
  comprehensive: boolean;
  regulator: string;
  sourceUrl: string;
  lastReviewed: string;
  note?: string;
}

const OFAC_PROGRAMS_URL =
  "https://ofac.treasury.gov/sanctions-programs-and-country-information";

export const SANCTIONS_CITATIONS: readonly SanctionCitation[] = [
  { code: "CU", name: "Cuba", comprehensive: true, regulator: "US OFAC — Cuban Assets Control Regulations (31 CFR 515)", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11" },
  { code: "IR", name: "Iran", comprehensive: true, regulator: "US OFAC — Iranian Transactions and Sanctions Regulations (31 CFR 560)", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11" },
  { code: "KP", name: "North Korea", comprehensive: true, regulator: "US OFAC — North Korea Sanctions Regulations (31 CFR 510)", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11" },
  { code: "SY", name: "Syria", comprehensive: false, regulator: "US OFAC — targeted authorities (comprehensive SySR revoked by EO 14312, 30 Jun 2025)", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "No longer a comprehensive embargo; retained on conservative auto-reject set." },
  { code: "RU", name: "Russia", comprehensive: false, regulator: "US OFAC — Russian Harmful Foreign Activities (EO 14024) + Ukraine/Russia programs", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "Targeted/sectoral, not comprehensive." },
  { code: "BY", name: "Belarus", comprehensive: false, regulator: "US OFAC — Belarus Sanctions (EO 14038)", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "Targeted, not comprehensive." },
  { code: "VE", name: "Venezuela", comprehensive: false, regulator: "US OFAC — Venezuela-related sanctions", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "Targeted, not comprehensive." },
  { code: "MM", name: "Myanmar (Burma)", comprehensive: false, regulator: "US OFAC — Burma-related sanctions (EO 14014)", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "Targeted, not comprehensive." },
  { code: "SD", name: "Sudan", comprehensive: false, regulator: "US OFAC — Sudan-related program", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "Targeted, not comprehensive." },
  { code: "SS", name: "South Sudan", comprehensive: false, regulator: "US OFAC — South Sudan-related sanctions", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "Targeted, not comprehensive." },
  { code: "YE", name: "Yemen", comprehensive: false, regulator: "US OFAC — Yemen-related sanctions", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "Targeted, not comprehensive." },
  { code: "ZW", name: "Zimbabwe", comprehensive: false, regulator: "US OFAC — Zimbabwe-related program", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "Targeted, not comprehensive." },
  { code: "AF", name: "Afghanistan", comprehensive: false, regulator: "US OFAC — Afghanistan-related (Taliban/SDGT) authorities", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "Targeted, not comprehensive." },
  { code: "LY", name: "Libya", comprehensive: false, regulator: "US OFAC — Libya sanctions (31 CFR 570)", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "Targeted, not comprehensive." },
  { code: "ML", name: "Mali", comprehensive: false, regulator: "US OFAC — Mali-related sanctions (EO 13882)", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "Targeted, not comprehensive." },
  { code: "NI", name: "Nicaragua", comprehensive: false, regulator: "US OFAC — Nicaragua-related sanctions", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "Targeted, not comprehensive." },
  { code: "SO", name: "Somalia", comprehensive: false, regulator: "US OFAC — Somalia sanctions (31 CFR 551)", sourceUrl: OFAC_PROGRAMS_URL, lastReviewed: "2026-07-11", note: "Targeted, not comprehensive." },
];

/** Current OFAC comprehensive-embargo country codes (whole-country prohibition). */
export const COMPREHENSIVE_SANCTION_CODES: ReadonlySet<string> = new Set(
  SANCTIONS_CITATIONS.filter((c) => c.comprehensive).map((c) => c.code),
);

export type JurisdictionAction = "reject" | "hold" | "allow";

/**
 * Server-side decision for a REQUESTER country code:
 *   - sanctioned (OFAC auto-reject set)   → "reject"
 *   - licence-required (SG/MY, hold list) → "hold"  (manual admin review, NOT reject)
 *   - anything else                       → "allow"
 * Sanctions outrank the licence hold. This encodes the §3 critical behavior in the
 * policy module; lib/jurisdiction-review.ts wires the same order into the full review.
 */
export function classifyRequesterJurisdiction(
  code: string | null | undefined,
): JurisdictionAction {
  if (isSanctionedCountry(code)) return "reject";
  const c = code?.trim().toUpperCase() ?? null;
  if (c && RESTRICTED_JURISDICTION_CODES.has(c as RestrictedJurisdictionCode)) {
    return "hold";
  }
  return "allow";
}

/**
 * Single policy handle other modules can read. `needsLegalReview` is intentionally
 * hard-coded true: this file is engineering's best effort at encoding sanctions +
 * licensing signals, NOT a legal determination.
 *
 * THIS IS NOT LEGAL ADVICE. The country lists and citations above must be reviewed
 * and signed off by qualified counsel before they are relied on for any go/no-go
 * decision. Sanctions and licensing regimes change; the lastReviewed dates say when
 * each entry was last checked, not that it is currently authoritative.
 */
export const JURISDICTION_POLICY = {
  needsLegalReview: true as const,
  comprehensiveSanctions: COMPREHENSIVE_SANCTION_CODES,
  conservativeAutoReject: OFAC_BLOCKED_COUNTRY_CODES,
  licenceRequired: RESTRICTED_JURISDICTION_CODES,
  sanctionsCitations: SANCTIONS_CITATIONS,
  licenceCitations: LICENSE_RESTRICTED_JURISDICTIONS,
} as const;

export interface Country {
  code: string;
  name: string;
}

// Single source of truth for the residence-country dropdown + server validation.
export const COUNTRIES: readonly Country[] = [
  { code: "AF", name: "Afghanistan" },
  { code: "AX", name: "Aland Islands" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AS", name: "American Samoa" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AI", name: "Anguilla" },
  { code: "AQ", name: "Antarctica" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AW", name: "Aruba" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BM", name: "Bermuda" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BV", name: "Bouvet Island" },
  { code: "BR", name: "Brazil" },
  { code: "IO", name: "British Indian Ocean Territory" },
  { code: "BN", name: "Brunei Darussalam" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CV", name: "Cape Verde" },
  { code: "KY", name: "Cayman Islands" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CX", name: "Christmas Island" },
  { code: "CC", name: "Cocos (Keeling) Islands" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "Congo, Democratic Republic" },
  { code: "CK", name: "Cook Islands" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Cote D'Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "ET", name: "Ethiopia" },
  { code: "FK", name: "Falkland Islands" },
  { code: "FO", name: "Faroe Islands" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GF", name: "French Guiana" },
  { code: "PF", name: "French Polynesia" },
  { code: "TF", name: "French Southern Territories" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GI", name: "Gibraltar" },
  { code: "GR", name: "Greece" },
  { code: "GL", name: "Greenland" },
  { code: "GD", name: "Grenada" },
  { code: "GP", name: "Guadeloupe" },
  { code: "GU", name: "Guam" },
  { code: "GT", name: "Guatemala" },
  { code: "GG", name: "Guernsey" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HM", name: "Heard Island and Mcdonald Islands" },
  { code: "VA", name: "Holy See (Vatican City)" },
  { code: "HN", name: "Honduras" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IM", name: "Isle of Man" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JE", name: "Jersey" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KP", name: "Korea, North" },
  { code: "KR", name: "Korea, South" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MO", name: "Macao" },
  { code: "MK", name: "Macedonia" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MQ", name: "Martinique" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "YT", name: "Mayotte" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MS", name: "Montserrat" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "AN", name: "Netherlands Antilles" },
  { code: "NC", name: "New Caledonia" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NU", name: "Niue" },
  { code: "NF", name: "Norfolk Island" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PS", name: "Palestinian Territory" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PN", name: "Pitcairn" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "PR", name: "Puerto Rico" },
  { code: "QA", name: "Qatar" },
  { code: "RE", name: "Reunion" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "SH", name: "Saint Helena" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "PM", name: "Saint Pierre and Miquelon" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "Sao Tome and Principe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "GS", name: "South Georgia and South Sandwich Islands" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SJ", name: "Svalbard and Jan Mayen" },
  { code: "SZ", name: "Swaziland" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TK", name: "Tokelau" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TC", name: "Turks and Caicos Islands" },
  { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UM", name: "United States Minor Outlying Islands" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "VG", name: "Virgin Islands, British" },
  { code: "VI", name: "Virgin Islands, U.S." },
  { code: "WF", name: "Wallis and Futuna" },
  { code: "EH", name: "Western Sahara" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];

const COUNTRY_CODE_SET = new Set(COUNTRIES.map((c) => c.code));

/** True if `code` is a known ISO-3166 alpha-2 in our list (or the literal "OTHER"). */
export function isKnownCountryCode(code: string | null | undefined): boolean {
  if (!code) return false;
  const c = code.trim().toUpperCase();
  return c === "OTHER" || COUNTRY_CODE_SET.has(c);
}
