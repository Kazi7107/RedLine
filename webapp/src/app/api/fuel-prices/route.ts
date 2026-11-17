import { NextResponse } from "next/server";
import { getFuelPrices } from "@/lib/sources/eia";
import { handleError } from "@/lib/api";

export async function GET() {
  try {
    return NextResponse.json(await getFuelPrices());
  } catch (e) {
    return handleError(e);
  }
}
