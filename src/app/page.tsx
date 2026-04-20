import path from "node:path";
import { phaseOneScope } from "@/lib/project-scope";
import {
  buildReviewRequirements,
  parseRequirementsWorkbookFile,
  summarizeReviewRequirements,
} from "@/lib/requirements";
import RequirementsReviewWorkspace from "./requirements-review-workspace";

const fixturePath = "fixtures/customer-x-functional-requirements.xlsx";

export default async function Home() {
  const parsedRequirements = await parseRequirementsWorkbookFile(
    path.join(process.cwd(), fixturePath),
  );
  const summary = summarizeReviewRequirements(
    buildReviewRequirements(parsedRequirements),
  );

  return (
    <main className="mesh-background min-h-screen overflow-x-hidden text-[#f5fbf8]">
      <section className="mx-auto flex w-full max-w-[1540px] flex-col gap-8 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <nav
          aria-label="Product"
          className="animate-enter flex w-full max-w-[calc(100vw-2rem)] flex-wrap items-center justify-between gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#2f8f8a]/35 bg-[#2f8f8a]/12 text-sm font-black text-[#d2eee7] shadow-sm shadow-black/20">
              CM
            </div>
            <div className="min-w-0">
              <p className="mono-label truncate text-[0.64rem] text-[#8fcac0]">
                FEUP LGP 18 x Critical Manufacturing
              </p>
              <p className="truncate text-sm font-semibold text-white">
                MES Demo Advisor
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#cde9e1]">
            <span className="rounded-full border border-[#c8953f]/35 bg-[#c8953f]/10 px-3 py-1.5 text-[#ead19a]">
              Phase 1 MVP
            </span>
            <span className="rounded-full border border-[#6fa8b8]/30 bg-[#6fa8b8]/10 px-3 py-1.5 text-[#c9dde3]">
              Prototype draft mode
            </span>
          </div>
        </nav>

        <header className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] lg:items-stretch">
          <div className="premium-panel-strong animate-enter animate-delay-1 relative w-full max-w-[calc(100vw-2rem)] min-w-0 overflow-hidden rounded-2xl p-6 sm:p-8 lg:max-w-none lg:p-10">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#2f8f8a]/6 blur-xl" />
            <div className="absolute bottom-0 right-6 hidden h-32 w-56 rounded-t-full border border-[#6fa8b8]/10 bg-[#6fa8b8]/5 lg:block" />
            <div className="relative">
              <p className="mono-label mb-5 inline-flex rounded-full border border-[#2f8f8a]/25 bg-[#2f8f8a]/10 px-3 py-1.5 text-[0.68rem] text-[#8fcac0]">
                Excel-first advisor · Consultant reviewed
              </p>
              <h1 className="max-w-full break-words text-3xl font-bold leading-[1.04] tracking-[-0.045em] text-white sm:max-w-4xl sm:text-6xl sm:leading-[0.98] lg:text-7xl">
                Turn customer requirements into a demo-ready MES story.
              </h1>
              <p className="mt-6 max-w-full break-words text-base leading-8 text-[#c9ded8] sm:max-w-3xl sm:text-lg">
                {phaseOneScope.productName} parses the Customer X requirements,
                drafts consultant-facing MES comments, guides review decisions,
                and assembles a traceable Phase 1 demo script for export.
              </p>
              <div className="mt-8 flex min-w-0 flex-wrap gap-3">
                <a
                  href="#workspace"
                  className="focus-premium rounded-full bg-[#2f8f8a] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:bg-[#3b9d98]"
                >
                  Open review workspace
                </a>
                <span className="max-w-full rounded-full border border-white/12 bg-white/[0.06] px-5 py-3 text-sm font-semibold leading-6 text-[#dff8f0]">
                  Source → Generate → Review → Script → Export
                </span>
              </div>
            </div>
          </div>

          <aside className="premium-panel animate-enter animate-delay-2 grid w-full max-w-[calc(100vw-2rem)] min-w-0 content-between gap-5 overflow-hidden rounded-2xl p-5 sm:p-6 lg:max-w-none">
            <div className="rounded-xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mono-label text-[0.68rem] text-[#8fcac0]">
                    Active source
                  </p>
                  <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-white">
                    Customer X fixture
                  </h2>
                  <p className="mt-2 break-all text-sm leading-6 text-[#adc8c1]">
                    {fixturePath}
                  </p>
                </div>
                <div className="hidden h-12 w-20 shrink-0 place-items-center rounded-2xl border border-[#6fa8b8]/30 bg-[#6fa8b8]/10 text-2xl text-[#c9dde3] sm:grid">
                  XLSX
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <HeroStat label="Rows" value={summary.allCount} />
                <HeroStat label="Demo" value={summary.demoCount} />
                <HeroStat label="MVP" value={summary.mvpCount} />
              </div>
            </div>

            <div className="grid gap-3">
              {["Source", "Generate", "Review", "Script", "Export"].map(
                (step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-[#2f8f8a]/30 bg-[#2f8f8a]/10 font-mono text-xs font-bold text-[#d2eee7]">
                      {index + 1}
                    </span>
                    <span className="font-semibold text-[#eefcf8]">{step}</span>
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2f8f8a]" />
                  </div>
                ),
              )}
            </div>
          </aside>
        </header>

        <RequirementsReviewWorkspace
          projectMetadata={{
            projectId: "customer-x-fixture",
            projectName: "Customer X Demo",
            customerName: "Customer X",
            sourceFilename: fixturePath,
            sourceRowCount: parsedRequirements.length,
          }}
          requirements={parsedRequirements}
        />
      </section>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <p className="font-mono text-2xl font-bold text-white">{value}</p>
      <p className="mono-label mt-1 text-[0.58rem] text-[#9cbab3]">{label}</p>
    </div>
  );
}
