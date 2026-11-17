import { NextResponse } from "next/server";
import { getOptions } from "@/lib/sources/fueleconomy";
import { handleError, requireParam, requireYear } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    return NextResponse.json(await getOptions(requireYear(url), requireParam(url, "make"), requireParam(url, "model")));
  } catch (e) {
    return handleError(e);
  }
}
