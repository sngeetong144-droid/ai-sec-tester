/**
 * RETIRED — this emailed-HMAC-token page used to run the scan engine as a render
 * side-effect, with no admin session and no console activation. The scan engine
 * is now private: it executes ONLY when an admin activates a paid case in the
 * Command Center (see app/actions/scans.ts executeScan + lib/command-center/
 * admin.ts). This page no longer reaches the engine.
 *
 * ponytail: kept as a static "moved" page so old re-scan links resolve cleanly.
 * Delete once no live emails carry the old link.
 */
export const dynamic = "force-static";

export default function RescanPage() {
  return (
    <main className="grid-bg min-h-screen flex items-center justify-center">
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-3">
          Re-scans moved to the Command Center
        </h1>
        <p className="text-slate-500">
          Complimentary re-scans are now activated by an operator in the private
          Command Center. This one-click email re-scan link has been retired.
          Contact{" "}
          <a href="mailto:hello@thesoulsofai.com" className="text-brand-600 hover:underline">
            support
          </a>{" "}
          to schedule your re-scan.
        </p>
      </div>
    </main>
  );
}
