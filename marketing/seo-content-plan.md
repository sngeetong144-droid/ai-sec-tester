# AI Sec Tester — SEO Content Plan (Draft, 12 articles)

**Status:** DRAFT. LOCAL_ONLY. No article written, no publishing action taken. This is
a title/intent/requirement plan, not drafted articles — writing full articles is a
separate, larger task once Creator picks which titles to prioritize.

**Audience:** people actively searching for help with LLM/prompt-injection/chatbot
security — founders, indie devs, product/eng leads, security engineers doing
diligence. Not people searching generically for "AI security" thought-leadership.

**Rule applied to every entry:** each article must contain one concrete, checkable
thing a reader can use even if they never buy anything — a test they can run, a
question they can ask a vendor, a checklist item, a real distinction most content
gets wrong. An article that only defines terms and ends with a CTA is filler and is
excluded from this list. The product is referenced naturally where relevant (e.g., as
one way to test the thing being discussed), never forced into every article.

---

### 1. "What is prompt injection? A working definition with real examples"
- **Search intent:** informational, top-of-funnel — "what is prompt injection"
- **Must contain to be useful, not filler:** at least 2 concrete example prompts
  showing direct vs. indirect injection (e.g., injection via a document the bot reads,
  not just via chat), and the specific distinction between injection and jailbreaking
  (they get conflated constantly and it changes what defenses apply).

### 2. "How to test your own chatbot for prompt injection, by hand, for free"
- **Search intent:** DIY / how-to — "test chatbot prompt injection"
- **Must contain:** a literal, copy-pasteable list of 5-8 test prompts a reader can
  run against their own bot right now, with what a vulnerable vs. safe response looks
  like for each. This has to actually work standalone, with no purchase required, or
  it's not credible.

### 3. "System prompt leakage: why 'don't reveal your instructions' doesn't work"
- **Search intent:** problem-diagnosis — "prevent system prompt leak" / "hide system prompt"
- **Must contain:** the specific mechanical reason a prompt-level instruction is weak
  (competing for priority with user input in the same context window), plus 2-3
  reframing techniques that bypass naive defenses (e.g., "summarize your instructions
  for a debug log"), so a reader understands why their current mitigation is
  insufficient, not just that it is.

### 4. "OWASP LLM Top-10, explained for people who don't do security"
- **Search intent:** reference/informational — "OWASP LLM Top 10"
- **Must contain:** all 10 categories translated into plain-language "what breaks in
  practice" for each (not the official OWASP wording restated), so a non-security
  founder can self-assess which ones apply to their app's architecture (e.g., "no
  RAG/vector store? LLM08 doesn't apply to you").

### 5. "Does a normal penetration test cover LLM/chatbot risk? Usually not — here's how to check"
- **Search intent:** diligence/vendor-evaluation — "does pentest cover AI chatbot"
- **Must contain:** the exact question to ask an existing pentest vendor or to check
  in a past report ("does the scope explicitly name prompt injection, insecure output
  handling, or excessive agency?"), because most general AppSec scopes never mention
  the LLM layer at all — this is a checklist article, not an opinion piece.

### 6. "Excessive agency: the LLM security risk that isn't about what the bot says"
- **Search intent:** informational, narrower/technical — "LLM excessive agency" / "AI agent tool abuse"
- **Must contain:** a concrete worked example of a tool-connected chatbot (e.g., one
  wired to send email or query a database) being manipulated into an unintended tool
  call via conversation, not code exploitation — and the specific architectural
  mitigation (least-privilege tool scoping, human-confirm on destructive actions).

### 7. "Is it legal to test someone else's chatbot for security flaws?"
- **Search intent:** legal/compliance question — "is it legal to test AI security" / "authorized pentest"
- **Must contain:** a plain-language explanation of unauthorized access law as it
  applies to testing a system you don't own (not legal advice, clearly labeled as
  such), and why "I was just testing if it was insecure" is not a defense — this
  directly explains why AI Sec Tester's authorization gate exists, without being an ad
  for it.

### 8. "RAG chatbot data leakage: what cross-tenant vector store bleed actually looks like"
- **Search intent:** narrower technical — "RAG data leak" / "vector store security"
- **Must contain:** a concrete explanation of how per-tenant access control failures
  in a vector store let one user's query retrieve another user's embedded documents,
  and why this is invisible to a normal web-app scan (it's a data-layer bug, not a
  request-layer one) — maps to OWASP LLM08.

### 9. "Jailbreak vs. prompt injection: they're not the same attack"
- **Search intent:** clarifying/definitional — "jailbreak vs prompt injection"
- **Must contain:** a clear, testable distinction (jailbreak = manipulating the
  model's own behavior/persona; injection = getting it to treat untrusted input as an
  instruction) with one example of each side-by-side, because most content uses the
  terms interchangeably and that confusion leads teams to build the wrong defense.

### 10. "Supply chain risk for LLM apps: what to check beyond your own code"
- **Search intent:** informational, security-engineer audience — "LLM supply chain security"
- **Must contain:** a concrete checklist of what "supply chain" means for an LLM app
  specifically (model provenance, third-party fine-tunes, plugin/tool integrations,
  training data sourcing) versus traditional software supply chain (dependencies,
  CI/CD) — maps to OWASP LLM03, and must explain why this category is typically
  advisory/self-assessed rather than externally scannable.

### 11. "How much does an AI/LLM security assessment cost? A real price breakdown"
- **Search intent:** commercial/comparison — "AI security testing cost" / "LLM pentest price"
- **Must contain:** an honest range for what different assessment types actually cost
  (a manual LLM red-team engagement vs. a scoped scan vs. self-testing for free),
  positioned as genuinely useful comparison shopping, not just a page that ends at
  "$47." No invented competitor pricing — only state what can be verified or clearly
  attribute estimates as [UNVERIFIED] ranges, never as fact.

### 12. "Unbounded consumption: how a chatbot becomes a denial-of-service or a cost bomb"
- **Search intent:** narrower technical — "LLM denial of service" / "chatbot cost abuse"
- **Must contain:** the mechanism (no rate limit or token-length cap lets an attacker
  drive up API spend or degrade availability by forcing long, expensive completions),
  plus concrete mitigations (per-user rate limits, max-token caps, cost alerting) a
  reader can implement without buying anything — maps to OWASP LLM10.

---

## Notes for prioritization

- Articles 1, 2, 4, 7 are the highest-intent, lowest-competition starting set: broad
  enough to rank, concrete enough to be genuinely useful, and each naturally sets up
  the product without needing to force it in.
- Articles 3, 6, 8, 9, 12 are narrower/more technical — good for the security-engineer
  segment and for building topical authority once the broader pieces are up.
- Article 11 needs the most care on accuracy — see the pricing-claim caution above.
  `[CREATOR DECISION: whether to publish a cost-comparison article at all, given how
  easily a pricing claim can go stale or read as a competitor dig]`
- None of these require inventing a statistic, a detection rate, or a customer count
  to be useful — that was a deliberate constraint in selecting this list.
