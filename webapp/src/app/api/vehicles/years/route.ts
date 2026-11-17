import { NextResponse } from "next/server";
import { getYears } from "@/lib/sources/fueleconomy";
import { handleError } from "@/lib/api";

export async function GET() {
  try {
    return NextResponse.json(await getYears());
  } catch (e) {
    return handleError(e);
  }
}
