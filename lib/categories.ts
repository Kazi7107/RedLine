/** Client-safe display metadata for cost categories and complaint types. */
import type { CategoryKey, ComplaintCategory } from "./cost/types";

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  depreciation: "Value you lose",
  fuel: "Fuel",
  insurance: "Insurance",
  maintenance: "Maintenance",
  repairs: "Repairs",
  taxes: "Taxes and registration",
};

/** Ordered dark to light so stacked bars read without relying on hue. Repairs use red only when flagged. */
export const CATEGORY_COLOR: Record<CategoryKey, string> = {
  fuel: "var(--cat-fuel)",
  insurance: "var(--cat-insurance)",
  depreciation: "var(--cat-depreciation)",
  maintenance: "var(--cat-maintenance)",
  repairs: "var(--cat-repairs)",
  taxes: "var(--cat-taxes)",
};

export const CATEGORY_ORDER: CategoryKey[] = ["depreciation", "fuel", "insurance", "maintenance", "repairs", "taxes"];

export const COMPLAINT_LABEL: Record<ComplaintCategory, string> = {
  engine: "Engine",
  transmission: "Transmission",
  electrical: "Electrical",
  "hybrid-system": "Hybrid system",
  brakes: "Brakes",
  steering: "Steering",
  suspension: "Suspension",
  "ac-heat": "AC and heat",
  body: "Body and doors",
  "fuel-system": "Fuel system",
  airbags: "Airbags",
};
