import { EnterpriseForm } from "@/app/_components/enterprise-form";

export const metadata = {
  title: "Enterprise Scan Request — AI Sec Tester",
};

export default function EnterprisePage() {
  return (
    <main className="grid-bg min-h-screen">
      <div className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/60 px-3 py-1 text-xs text-brand-600">
            <span className="size-1.5 rounded-full bg-brand-500" />
            Enterprise Deep Scan
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
            Request an{" "}
            <span className="text-brand-600">Enterprise Scan</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-slate-500">
            Our team reviews every request before the scan runs. Complete the
            form below and we&apos;ll email you the outcome of that review — a
            payment link if it is approved, or the reason if it is not. The scan
            starts automatically once payment settles.
          </p>
        </header>

        <div className="mb-6 grid grid-cols-3 gap-3 text-center text-xs">
          {[
            ["Authorization verified", "We confirm ownership before any scan"],
            ["Automated triage", "Instant risk check on submission"],
            ["Full PDF report", "Branded report with evidence per finding"],
          ].map(([title, desc]) => (
            <div
              key={title}
              className="rounded-xl border border-violet-100 bg-white/60 p-3"
            >
              <p className="font-semibold text-slate-700">{title}</p>
              <p className="mt-1 text-slate-400">{desc}</p>
            </div>
          ))}
        </div>

        <EnterpriseForm />

        <p className="mt-6 text-center text-xs text-slate-400">
          Questions? Email{" "}
          <a
            href="mailto:hello@thesoulsofai.com"
            className="text-slate-500 hover:text-slate-700"
          >
            hello@thesoulsofai.com
          </a>
        </p>
      </div>
    </main>
  );
}
