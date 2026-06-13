import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { makeReScanToken } from "@/lib/hmac";
import { executeScan } from "@/app/actions/scans";

export const dynamic = "force-dynamic";

export default async function RescanPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) return notFound();

  const supabase = await createClient();

  const { data: rows } = await supabase.rpc(
    "get_enterprise_request_by_rescan_token",
    { p_token: token },
  );
  const req = Array.isArray(rows) ? rows[0] : rows;

  if (!req) return notFound();
  if (makeReScanToken(req.id) !== token) return notFound();

  if (req.re_scan_used) {
    return (
      <main className="grid-bg min-h-screen flex items-center justify-center">
        <div className="mx-auto max-w-lg px-5 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-100 mb-3">
            Re-Scan Already Used
          </h1>
          <p className="text-slate-400">
            Your complimentary re-scan has already been used.
          </p>
          <a
            href="/enterprise"
            className="mt-6 inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Submit a New Request
          </a>
        </div>
      </main>
    );
  }

  // Mark used and run new scan
  let newScanId: string | null = null;
  try {
    newScanId = await executeScan({
      target: req.chatbot_url,
      email: req.email,
      sessionId: null,
    });

    await supabase.rpc("mark_rescan_used", {
      p_id: req.id,
      p_scan_id: newScanId,
    });
  } catch (err) {
    console.error("[enterprise:rescan] scan failed:", err);
    return (
      <main className="grid-bg min-h-screen flex items-center justify-center">
        <div className="mx-auto max-w-lg px-5 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-100 mb-3">
            Re-Scan Failed
          </h1>
          <p className="text-slate-400">
            There was an error running the re-scan. Please contact{" "}
            <a
              href="mailto:hello@thesoulsofai.com"
              className="text-brand-400"
            >
              support
            </a>
            .
          </p>
        </div>
      </main>
    );
  }

  redirect(`/enterprise/report/${req.report_token}`);
}
