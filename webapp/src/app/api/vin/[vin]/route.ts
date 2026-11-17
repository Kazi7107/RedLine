import { NextResponse } from "next/server";
import { decodeVin, isValidVin } from "@/lib/sources/nhtsa";
import { handleError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ vin: string }> }) {
  try {
    const { vin } = await params;
    if (!isValidVin(vin)) return NextResponse.json({ error: "A VIN is 17 letters and numbers (no I, O or Q)." }, { status: 400 });
    return NextResponse.json(await decodeVin(vin));
  } catch (e) {
    return handleError(e);
  }
}
