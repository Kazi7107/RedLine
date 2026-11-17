import { NextResponse } from "next/server";
import { WA_LOCATIONS } from "@/lib/reference/wa-fees";

/** Static reference data the UI needs (locations for the tax/fee lookup). */
export function GET() {
  return NextResponse.json({
    locations: Object.entries(WA_LOCATIONS).map(([key, l]) => ({ key, label: l.label })),
  });
}
