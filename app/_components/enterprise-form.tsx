"use client";

import { useActionState, useState } from "react";
import {
  submitEnterpriseRequest,
  type EnterpriseFormState,
} from "@/app/actions/enterprise";

const OWNERSHIP_METHODS = [
  {
    id: "dns_txt",
    label: "DNS TXT Record",
    description:
      'Add a TXT record to your domain DNS: Name = "_aist-verify", Value = your email address. Requires domain admin access.',
  },
  {
    id: "file_upload",
    label: "Verification File",
    description:
      'Place a file at https://yourdomain.com/.well-known/aist-verify.txt containing your email address. Requires hosting access.',
  },
  {
    id: "meta_tag",
    label: "HTML Meta Tag",
    description:
      'Add <meta name="aist-verify" content="YOUR_EMAIL"> to your site\'s <head>. Requires code/CMS access.',
  },
] as const;

const AGREEMENT = `By submitting this form, you confirm that:
1. You are the owner of, or have explicit written authorization from the owner of, the chatbot at the URL specified.
2. You consent to automated security testing of that chatbot by AI Sec Tester.
3. You understand findings are for informational and defensive purposes only.
4. You will not use these findings to attack, harm, or disrupt the target system.
5. You understand that misrepresenting ownership or authorization is illegal in most jurisdictions and you accept full legal responsibility.`;

const initial: EnterpriseFormState = {};

export function EnterpriseForm() {
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [ownershipMethod, setOwnershipMethod] = useState<string>("");
  const [state, action, isPending] = useActionState(
    submitEnterpriseRequest,
    initial,
  );

  const steps = [
    "About You",
    "Target Chatbot",
    "Prove Ownership",
    "Agreement",
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`flex size-7 items-center justify-center rounded-full text-xs font-bold transition ${
                  done
                    ? "bg-brand-500 text-white"
                    : active
                      ? "border border-brand-400 text-brand-400"
                      : "border border-slate-700 text-slate-600"
                }`}
              >
                {done ? "✓" : n}
              </div>
              <span
                className={`hidden text-xs sm:block ${active ? "text-slate-200" : "text-slate-600"}`}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <div className="h-px w-6 bg-slate-800 sm:w-10" />
              )}
            </div>
          );
        })}
      </div>

      <form action={action}>
        {/* Hidden inputs that persist across steps */}
        <input type="hidden" name="agreed_to_tos" value={agreed ? "true" : "false"} />
        <input type="hidden" name="ownership_method" value={ownershipMethod} />

        {/* Step 1 — About You */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">About You</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name *" name="full_name" required />
              <Field label="Work email *" name="email" type="email" required />
              <Field label="Company / Organisation" name="company" />
              <Field label="Your role / title" name="role_title" />
            </div>
            <Field label="Phone (optional)" name="phone" type="tel" />
          </div>
        )}

        {/* Step 2 — Target */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">
              Target Chatbot
            </h2>
            <Field
              label="Chatbot URL *"
              name="chatbot_url"
              placeholder="https://yoursite.com"
              required
            />
            <div>
              <label className="mb-1.5 block text-sm text-slate-400">
                Describe the chatbot (what it does, which platform)
              </label>
              <textarea
                name="target_description"
                rows={3}
                placeholder="e.g. Customer support bot built on OpenAI GPT-4o, embedded on our homepage via Intercom"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-brand-400 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Step 3 — Ownership */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">
              Prove Ownership
            </h2>
            <p className="text-sm text-slate-400">
              Choose any one method to verify you control the target domain.
              Instructions are provided after you select.
            </p>
            <div className="space-y-3">
              {OWNERSHIP_METHODS.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${
                    ownershipMethod === m.id
                      ? "border-brand-400 bg-brand-500/10"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="_ownership_method_radio"
                    value={m.id}
                    checked={ownershipMethod === m.id}
                    onChange={() => setOwnershipMethod(m.id)}
                    className="mt-0.5 accent-brand-400"
                  />
                  <div>
                    <p className="font-medium text-slate-200">{m.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {m.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            {ownershipMethod && (
              <div>
                <label className="mb-1.5 block text-sm text-slate-400">
                  Notes / confirmation (e.g. TXT record value you set, or that
                  you&apos;ve placed the file)
                </label>
                <textarea
                  name="ownership_detail"
                  rows={2}
                  placeholder="e.g. DNS TXT record set to my@company.com on 2026-06-13"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-brand-400 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Agreement */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">
              Authorization Agreement
            </h2>
            <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs leading-relaxed text-slate-400">
              {AGREEMENT}
            </pre>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-brand-400"
              />
              <span className="text-sm text-slate-300">
                I have read and agree to the above authorization agreement. I
                confirm I am the owner or authorized representative.
              </span>
            </label>

            {state?.error && (
              <p className="rounded-lg border border-rose-800 bg-rose-950/30 px-4 py-2 text-sm text-rose-400">
                {state.error}
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-200"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 3 && !ownershipMethod) return;
                setStep((s) => s + 1);
              }}
              className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={!agreed || isPending}
              className="rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "Submitting…" : "Submit Request"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-slate-400">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-brand-400 focus:outline-none"
      />
    </div>
  );
}
