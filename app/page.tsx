import "./landing.css";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/command-center/admin";
import { Landing, LandingFooter } from "@/app/_components/landing";
import { SeoJsonLd } from "@/app/_components/faq";
import { JURISDICTION_NOTICE } from "@/lib/jurisdiction-policy";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // A signed-in admin belongs in the Command Center, not on the public page.
  // Self-serve scanning was removed, so there is no longer an authenticated
  // homepage — the old "Recent scans" view lived here and is superseded by the
  // console's Report history / Scan cases.
  if (isAdminEmail(user?.email)) redirect("/command-center");

  // Everyone else — anonymous visitors, or a signed-in non-admin — gets the
  // faithful emerald marketing landing. Tier CTAs route to the authorization
  // request flow; no payment/checkout links on the public page.
  return (
    <main className="grid-bg min-h-screen">
      <SeoJsonLd />
      <Landing />

      <div className="aist-landing">
        <div className="wrap" style={{ paddingBottom: 40 }}>
          <p className="muted" style={{ fontSize: 13.5, textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
            AI Sec Tester is for defensive chatbot assessments on systems you own or
            are explicitly authorized to test. {JURISDICTION_NOTICE}
          </p>
        </div>
      </div>

      <LandingFooter />
    </main>
  );
}
