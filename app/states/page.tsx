import type { Metadata } from "next";
import { StatesGallery } from "@/components/compare/StatesGallery";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getEstimate } from "@/lib/data";

/** Design review page: every empty / loading / error / stale state in one place. Not linked from the site. */
export const metadata: Metadata = { title: "UI states", robots: { index: false, follow: false } };

export default async function StatesPage() {
  const opts = { latency: false } as const;
  const [civic, corolla, saturn] = await Promise.all([
    getEstimate({ key: "2017-honda-civic-lx", mileage: 68400, price: 15900, zip: "98201", annualMiles: 12000 }, opts),
    getEstimate({ key: "2016-toyota-corolla-le", mileage: 74200, price: 14200, zip: "98201", annualMiles: 12000 }, opts),
    getEstimate({ key: "2009-saturn-astra-xr", mileage: 112000, price: 3900, zip: "98201", annualMiles: 12000 }, opts),
  ]);
  if (civic.status !== "ok" || civic.stage !== "full" || corolla.status !== "ok" || corolla.stage !== "full" || saturn.status !== "insufficient_data") {
    throw new Error("States fixtures failed to load");
  }
  return (
    <div className="app-shell">
      <SiteHeader />
      <main id="main" className="app-main">
        <div className="wrap wrap--wide gallery-wrap">
          <h1 className="display">UI states</h1>
          <p className="lead">For design review. Each state uses the real components with sample data.</p>
          <StatesGallery civic={civic} corolla={corolla} saturn={saturn} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
