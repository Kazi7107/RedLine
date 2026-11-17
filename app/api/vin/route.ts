/**
 * GET /api/vin?vin=2T1BURHE5GC512345
 * Decodes a VIN to a catalog year/make/model/trim. Mock mode knows the sample
 * VINs in lib/data/mock/seed.ts. TODO(db): live mode goes through NHTSA vPIC
 * (see lib/data/live.ts decodeVin).
 */
import { NextResponse, type NextRequest } from "next/server";
import { decodeVin } from "@/lib/data";
import { vinError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const vin = (req.nextUrl.searchParams.get("vin") ?? "").trim().toUpperCase();
  const invalid = vinError(vin) ?? (vin ? null : "Paste a VIN first.");
  if (invalid) return NextResponse.json({ status: "error", code: "invalid_input", message: invalid }, { status: 400 });

  try {
    const result = await decodeVin(vin);
    if (!result) {
      return NextResponse.json(
        { status: "error", code: "not_found", message: "We couldn't match that VIN to a car we cover. Pick it from the lists above instead." },
        { status: 404 },
      );
    }
    return NextResponse.json({ status: "ok", result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    console.error("[api/vin]", err);
    return NextResponse.json({ status: "error", code: "not_connected", message: "VIN lookup is down right now." }, { status: 503 });
  }
}
