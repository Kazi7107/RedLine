import { NextResponse } from "next/server";
import { getVehicle } from "@/lib/sources/fueleconomy";
import { handleError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ epaId: string }> }) {
  try {
    const { epaId } = await params;
    const id = Number(epaId);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Invalid EPA vehicle id" }, { status: 400 });
    return NextResponse.json(await getVehicle(id));
  } catch (e) {
    return handleError(e);
  }
}
