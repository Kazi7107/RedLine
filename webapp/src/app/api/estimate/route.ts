import { NextResponse } from "next/server";
import { estimateRequestSchema } from "@/lib/validation";
import { getVehicle } from "@/lib/sources/fueleconomy";
import { getFuelPrices } from "@/lib/sources/eia";
import { estimateOwnership } from "@/lib/cost-model";
import { handleError } from "@/lib/api";

/** POST { epaId, inputs } → full 5-year ownership estimate. */
export async function POST(req: Request) {
  try {
    const body = estimateRequestSchema.parse(await req.json());
    const [vehicle, prices] = await Promise.all([getVehicle(body.epaId), getFuelPrices()]);
    return NextResponse.json(estimateOwnership(vehicle, body.inputs, prices));
  } catch (e) {
    return handleError(e);
  }
}
