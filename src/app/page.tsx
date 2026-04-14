import Image from "next/image";
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
    <main className="min-h-screen bg-[#f5f7f7] text-[#191919]">
      <section className="mx-auto flex w-full max-w-[1520px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="grid gap-6 border-b border-[#d0d7de] pb-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase text-[#0f766e]">
              FEUP LGP x Critical Manufacturing
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-[#111827]">
              Requirements Review With Local Actions
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#3a3a3a]">
              Inspect the parsed Customer X Excel requirements, record local
              consultant notes, and move rows through approve, flag, skip, or
              reset states before AI generation exists.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#30363d]">
              {phaseOneScope.productName} keeps this slice Excel-first and
              fixture-backed.
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
              <p className="text-sm font-semibold text-[#0f766e]">
                Fixture parsed server-side
              </p>
              <p className="mt-1 break-words text-sm text-[#4a4a4a]">
                {fixturePath}
              </p>
              <p className="mt-3 text-sm text-[#4a4a4a]">
                {summary.allCount} total rows, {summary.demoCount} demo rows,{" "}
                {summary.mvpCount} MVP rows
              </p>
            </div>
          </div>
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
