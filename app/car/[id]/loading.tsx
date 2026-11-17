import { SiteHeader } from "@/components/SiteHeader";

/** Streams instantly while the estimate loads: same layout as the page, in skeleton. */
export default function Loading() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main id="main" className="app-main" aria-busy="true">
        <div className="wrap wrap--wide detail">
          <span className="sk sk--soft" style={{ width: 180, height: 20 }} />
          <section className="detail__hero">
            <div className="detail__intro" style={{ flex: "1 1 420px" }}>
              <span className="sk sk--soft" style={{ width: 240, height: 12 }} />
              <span className="sk" style={{ width: "70%", height: 56 }} />
              <span className="sk sk--soft" style={{ width: "90%", height: 14 }} />
              <span className="sk sk--soft" style={{ width: "60%", height: 14 }} />
            </div>
            <div className="detail__figures">
              <span className="sk" style={{ width: 220, height: 76 }} />
              <span className="sk sk--soft" style={{ width: 240, height: 90, borderRadius: 14 }} />
            </div>
          </section>
          <section className="panel">
            <span className="sk sk--soft" style={{ width: 140, height: 20 }} />
            <div className="sk-chart" aria-hidden="true">
              {[62, 50, 58, 54, 66].map((h, i) => (
                <span key={i} className="sk" style={{ height: `${h}%` }} />
              ))}
            </div>
          </section>
          <p role="status" className="sr-only">
            Loading the year-by-year numbers
          </p>
        </div>
      </main>
    </div>
  );
}
