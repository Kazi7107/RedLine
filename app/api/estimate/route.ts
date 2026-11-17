/**
 * GET /api/estimate?key=2016-toyota-corolla-le&mileage=74200&price=14200&zip=98201&miles=12000&stage=summary|full
 *
 * Returns an EstimateResponse (lib/data/types.ts). `stage=summary` returns the
 * totals fast; `stage=full` adds the breakdown, recalls and complaints. The
 * results page calls summary first, then full, so the total shows up first.
 *
 * This route never talks to an API directly. It goes through lib/data, which
 * picks mock or live from USE_MOCK_DATA.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getEstimate, parseEstimateRequest } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const parsed = parseEstimateRequest({
    key: q.get("key"),
    mileage: q.get("mileage"),
    price: q.get("price"),
    zip: q.get("zip"),
    miles: q.get("miles"),
  });
  if (!parsed.ok) return NextResponse.json(parsed.error, { status: 400 });

  const stage = q.get("stage") === "summary" ? "summary" : "full";
  try {
    const result = await getEstimate(parsed.value, { stage });
    const status = result.status === "error" ? (result.code === "not_found" ? 404 : 400) : 200;
    return NextResponse.json(result, {
      status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    // Live mode before it's connected, or an upstream failure with no cached row.
    console.error("[api/estimate]", err);
    return NextResponse.json(
      { status: "error", code: "not_connected", message: "We couldn't reach our data right now. Try again in a minute." },
      { status: 503 },
    );
  }
}
