import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SourceError } from "./http";

/** Consistent JSON error responses for route handlers. */
export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "Invalid input", issues: err.issues }, { status: 400 });
  }
  if (err instanceof SourceError) {
    const status = err.status === 404 ? 404 : 502;
    return NextResponse.json({ error: err.message, source: err.source }, { status });
  }
  console.error(err);
  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}

export function requireParam(url: URL, name: string): string {
  const v = url.searchParams.get(name);
  if (!v) throw new ZodError([{ code: "custom", path: [name], message: `Missing query parameter: ${name}` }]);
  return v;
}

export function requireYear(url: URL): number {
  const y = Number(requireParam(url, "year"));
  if (!Number.isInteger(y) || y < 1984 || y > new Date().getFullYear() + 2) {
    throw new ZodError([{ code: "custom", path: ["year"], message: "Year must be 1984 or later" }]);
  }
  return y;
}
