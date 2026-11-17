import { NextResponse } from "next/server";
import { getModels } from "@/lib/sources/fueleconomy";
import { handleError, requireParam, requireYear } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    return NextResponse.json(await getModels(requireYear(url), requireParam(url, "make")));
  } catch (e) {
    return handleError(e);
  }
}
