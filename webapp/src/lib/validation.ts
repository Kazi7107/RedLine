import { z } from "zod";
import { WA_LOCATIONS } from "./reference/wa-fees";

export const ownershipInputsSchema = z.object({
  purchasePrice: z.coerce.number().min(500).max(500_000),
  currentMileage: z.coerce.number().min(0).max(500_000),
  milesPerYear: z.coerce.number().min(1_000).max(60_000),
  location: z.string().refine((k) => k in WA_LOCATIONS, "Unknown location"),
  driverAge: z.enum(["under25", "25to64", "65plus"]),
  coverage: z.enum(["full", "liability"]),
  years: z.coerce.number().int().min(1).max(10).default(5),
  downPayment: z.coerce.number().min(0).optional(),
  loanApr: z.coerce.number().min(0).max(0.4).optional(),
  loanTermMonths: z.coerce.number().int().min(0).max(96).optional(),
  fuelInflation: z.coerce.number().min(-0.1).max(0.2).optional(),
});

export const estimateRequestSchema = z.object({
  epaId: z.coerce.number().int().positive(),
  inputs: ownershipInputsSchema,
});
