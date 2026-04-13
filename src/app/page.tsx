import Image from "next/image";
import path from "node:path";
import { phaseOneScope } from "@/lib/project-scope";
import {
  parseRequirementsWorkbookFile,
  summarizeRequirements,
} from "@/lib/requirements";

const fixturePath = "fixtures/customer-x-functional-requirements.xlsx";

export default async function Home() {
  const requirements = await parseRequirementsWorkbookFile(
    path.join(process.cwd(), fixturePath),
  );
  const summary = summarizeRequirements(requirements);
  const sampleRequirements = requirements.slice(0, 5);

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
              Epic 1 parser validation for the committed Customer X requirements
              workbook. The Excel Comment column is source data, and no AI
              output is generated here.
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
                Fixture parsed
              </p>
              <p className="mt-1 break-words text-sm text-[#4a4a4a]">
                {fixturePath}
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Parsed rows", summary.rowCount],
            ["Demo rows", summary.demoCount],
            ["MVP rows", summary.mvpCount],
            ["Demo + MVP", summary.demoAndMvpCount],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-[#d0d7de] bg-white p-6"
            >
              <p className="text-sm font-semibold uppercase text-[#0f766e]">
                {label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-[#111111]">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-[#d0d7de] bg-white p-6">
            <h2 className="text-xl font-semibold">Epic 1 Boundary</h2>
            <p className="mt-3 leading-7 text-[#4a4a4a]">
              {phaseOneScope.mode} parsing only. Phase 2 Master Data generation
              and AI-generated comments stay out of this validation slice.
            </p>
          </div>

          <div className="rounded-lg border border-[#d0d7de] bg-white p-6">
            <h2 className="text-xl font-semibold">Sample Requirements</h2>
            <ul className="mt-4 grid gap-3">
              {sampleRequirements.map((requirement) => (
                <li
                  key={`${requirement.sourceRowNumber}-${requirement.requirementId}`}
                >
                  <p className="text-sm font-semibold text-[#0f766e]">
                    Row {requirement.sourceRowNumber} |{" "}
                    {requirement.requirementId}
                  </p>
                  <p className="mt-1 leading-7 text-[#333333]">
                    {requirement.requirementDescription}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </section>
    </main>
  );
}
