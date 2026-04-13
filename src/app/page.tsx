import Image from "next/image";
import { phaseOneScope } from "@/lib/project-scope";

const nextSteps = [
  "Parse the Requirements sheet",
  "Add consultant review states",
  "Generate requirement-level MES comments",
  "Export the demo guidance document",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f8fa] text-[#191919]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 sm:px-8 lg:px-10">
        <header className="grid gap-8 border-b border-[#d0d7de] pb-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase text-[#0f766e]">
              FEUP LGP x Critical Manufacturing
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-[#111111]">
              {phaseOneScope.productName}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#3a3a3a]">
              Phase 1 starts with a customer requirements workbook, keeps
              consultants in control of review, and prepares MES comments and
              demo guidance for a separate export.
            </p>
          </div>

          <div className="flex items-center gap-5 rounded-lg border border-[#d0d7de] bg-white p-5">
            <Image
              src="/file.svg"
              alt="Requirements workbook"
              width={48}
              height={48}
              className="h-12 w-12"
            />
            <div>
              <p className="text-sm font-semibold text-[#4f46e5]">
                Fixture ready
              </p>
              <p className="mt-1 break-words text-sm text-[#4a4a4a]">
                {phaseOneScope.fixturePath}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-[#d0d7de] bg-white p-6">
            <h2 className="text-xl font-semibold">MVP Boundary</h2>
            <p className="mt-3 leading-7 text-[#4a4a4a]">
              {phaseOneScope.mode}. Phase 2 Master Data generation stays out
              until explicitly requested.
            </p>
          </div>

          <div className="rounded-lg border border-[#d0d7de] bg-white p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold">Next Implementation Steps</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {nextSteps.map((step) => (
                <li
                  key={step}
                  className="rounded-lg border border-[#d0d7de] bg-[#fafafa] px-4 py-3 text-sm font-medium text-[#333333]"
                >
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </section>
    </main>
  );
}
