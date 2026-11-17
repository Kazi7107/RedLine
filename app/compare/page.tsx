import type { Metadata } from "next";
import { CompareApp } from "@/components/compare/CompareApp";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { resolveKey } from "@/lib/catalog";
import { getCatalog, isMockMode } from "@/lib/data";
import { SAMPLE_VINS } from "@/lib/data/mock";
import { decodeComparison } from "@/lib/share";

export const metadata: Metadata = {
  title: "Compare cars",
  description: "Add 2 or 3 used cars and see what each will really cost you over 5 years in Washington.",
};

type Search = Record<string, string | string[] | undefined>;

export default async function ComparePage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const catalog = await getCatalog();
  const comparison = decodeComparison(params);
  // decodeComparison already drops malformed tokens. Well-formed keys we don't
  // know still go through, so the "we don't have data on this car" card can show.
  const has = (k: string) => k in params;
  const model = typeof params.model === "string" && resolveKey(catalog, params.model) ? params.model : undefined;

  const mode = comparison.cars.length && !has("edit") ? "results" : has("start") || has("edit") || model ? "build" : "empty";

  // `edit=<n>` opens car n for editing (the detail page's "Edit car" uses edit=0).
  const editRaw = typeof params.edit === "string" ? Number(params.edit) : NaN;
  const initialEdit = Number.isInteger(editRaw) && editRaw >= 0 && editRaw < comparison.cars.length ? editRaw : undefined;

  // In mock mode, offer a sample VIN so the decode animation can be tried.
  const sampleVin = isMockMode() ? (SAMPLE_VINS.find((v) => v.startsWith("2T1")) ?? SAMPLE_VINS[0]) : undefined;

  return (
    <div className="app-shell">
      <SiteHeader cta={mode === "results" ? null : { href: "/methodology", label: "How we calculate", tone: "secondary" }} />
      <main id="main" className="app-main">
        <CompareApp
          catalog={catalog}
          initial={comparison}
          initialMode={mode}
          initialEdit={initialEdit}
          prefillModel={model}
          sampleVin={sampleVin}
          defaultZip=""
          sampleHref="/compare?cars=2017-honda-civic-lx.68400.15900~2016-toyota-corolla-le.74200.14200~2015-ford-focus-se.81500.8900&zip=98201"
        />
      </main>
      <SiteFooter />
    </div>
  );
}
