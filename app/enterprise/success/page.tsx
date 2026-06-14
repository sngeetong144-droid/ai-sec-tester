export const metadata = {
  title: "Request Received — AI Sec Tester",
};

export default function EnterpriseSuccessPage() {
  return (
    <main className="grid-bg min-h-screen flex items-center justify-center">
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <div className="mb-6 inline-flex size-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-600"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-800">Request Received</h1>
        <p className="mt-3 text-slate-500">
          We&apos;ve run an automated triage and the request is now with our
          team for review. You&apos;ll receive an email at the address you
          provided within{" "}
          <span className="font-semibold text-slate-700">24 hours</span>.
        </p>

        <div className="mt-8 space-y-3 rounded-xl border border-violet-100 bg-white/60 px-5 py-4 text-left text-sm text-slate-500">
          <p className="font-semibold text-slate-700">What happens next</p>
          <ol className="space-y-2 text-slate-400">
            <li>1. Our team reviews your submission and authorization evidence.</li>
            <li>2. If approved, the scan runs automatically.</li>
            <li>3. Your full report is emailed to you.</li>
            <li>4. You get one free re-scan after fixing the findings.</li>
          </ol>
        </div>

        <a
          href="/"
          className="mt-8 inline-block rounded-lg border border-violet-200 px-5 py-2.5 text-sm text-slate-500 hover:border-violet-400 hover:text-slate-700"
        >
          Back to scanner
        </a>
      </div>
    </main>
  );
}
