import { NextResponse } from "next/server";
import { getMakes } from "@/lib/sources/fueleconomy";
import { handleError, requireYear } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    return NextResponse.json(await getMakes(requireYear(url)));
  } catch (e) {
    return handleError(e);
  }
}
