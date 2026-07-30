/**
 * Root not-found. Without this file Next serves its built-in 404, which renders
 * OUTSIDE the root layout — so an expired/mistyped report link (notFound() in
 * app/enterprise/report/[token]/page.tsx and app/scans/[id]/page.tsx) landed a
 * paying customer on a bare, unbranded page with no site nav. Rendering our own
 * not-found puts it back inside the layout, so it wears the same chrome as
 * every other public route.
 */
export default function NotFound() {
  return (
    <main className="grid-bg min-h-screen flex items-center justify-center">
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">404</p>
        <h1 className="mb-3 text-2xl font-bold text-slate-800">
          That page isn&apos;t available
        </h1>
        <p className="text-slate-500">
          The link may have expired, or the report may have been removed. If you
          were sent a scan report link, check the most recent email — or contact{" "}
          <a
            href="mailto:hello@thesoulsofai.com"
            className="text-brand-600 hover:underline"
          >
            support
          </a>{" "}
          and we&apos;ll re-issue it.
        </p>
        <a
          href="/"
          className="mt-8 inline-block rounded-lg border border-violet-200 px-5 py-2.5 text-sm text-slate-600 hover:border-brand-500 hover:text-brand-600"
        >
          Back to AI Sec Tester
        </a>
      </div>
    </main>
  );
}
