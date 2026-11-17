import type { Locale } from "../../cost/types";
import { isWashingtonZip } from "../../validation";

/**
 * Washington sales tax by ZIP, approximated from WA DOR location codes.
 * TODO(db): replace with the wa_tax_rates reference table, loaded quarterly
 * from the WA DOR rate files (they key by location code, not ZIP, so the
 * table maps ZIP -> location code -> rate).
 */
const EXACT: Record<string, Omit<Locale, "zip">> = {
  "98201": { city: "Everett", county: "Snohomish", salesTaxRate: 0.099, rta: true },
  "98203": { city: "Everett", county: "Snohomish", salesTaxRate: 0.099, rta: true },
  "98012": { city: "Mill Creek", county: "Snohomish", salesTaxRate: 0.106, rta: true },
  "98011": { city: "Bothell", county: "King", salesTaxRate: 0.10, rta: true },
  "98004": { city: "Bellevue", county: "King", salesTaxRate: 0.101, rta: true },
  "98052": { city: "Redmond", county: "King", salesTaxRate: 0.101, rta: true },
  "98105": { city: "Seattle", county: "King", salesTaxRate: 0.1035, rta: true },
  "98195": { city: "Seattle", county: "King", salesTaxRate: 0.1035, rta: true },
  "98402": { city: "Tacoma", county: "Pierce", salesTaxRate: 0.103, rta: true },
  "98225": { city: "Bellingham", county: "Whatcom", salesTaxRate: 0.09, rta: false },
  "98501": { city: "Olympia", county: "Thurston", salesTaxRate: 0.098, rta: false },
  "98660": { city: "Vancouver", county: "Clark", salesTaxRate: 0.087, rta: false },
  "98801": { city: "Wenatchee", county: "Chelan", salesTaxRate: 0.086, rta: false },
  "98901": { city: "Yakima", county: "Yakima", salesTaxRate: 0.083, rta: false },
  "99163": { city: "Pullman", county: "Whitman", salesTaxRate: 0.079, rta: false },
  "99201": { city: "Spokane", county: "Spokane", salesTaxRate: 0.09, rta: false },
  "99336": { city: "Kennewick", county: "Benton", salesTaxRate: 0.089, rta: false },
};

const PREFIX: Record<string, Omit<Locale, "zip">> = {
  "980": { city: "", county: "King", salesTaxRate: 0.101, rta: true },
  "981": { city: "Seattle", county: "King", salesTaxRate: 0.1035, rta: true },
  "982": { city: "", county: "Snohomish", salesTaxRate: 0.099, rta: true },
  "983": { city: "", county: "Pierce", salesTaxRate: 0.103, rta: true },
  "984": { city: "Tacoma", county: "Pierce", salesTaxRate: 0.103, rta: true },
  "985": { city: "", county: "Thurston", salesTaxRate: 0.095, rta: false },
  "986": { city: "", county: "Clark", salesTaxRate: 0.087, rta: false },
  "988": { city: "", county: "Chelan", salesTaxRate: 0.086, rta: false },
  "989": { city: "", county: "Yakima", salesTaxRate: 0.083, rta: false },
  "990": { city: "", county: "Spokane", salesTaxRate: 0.09, rta: false },
  "991": { city: "", county: "Spokane", salesTaxRate: 0.09, rta: false },
  "992": { city: "Spokane", county: "Spokane", salesTaxRate: 0.09, rta: false },
  "993": { city: "", county: "Benton", salesTaxRate: 0.089, rta: false },
  "994": { city: "", county: "Walla Walla", salesTaxRate: 0.089, rta: false },
};

export function lookupLocale(zip: string): Locale | null {
  if (!isWashingtonZip(zip)) return null;
  const hit = EXACT[zip] ?? PREFIX[zip.slice(0, 3)];
  if (!hit) return { zip, city: "", county: "Washington", salesTaxRate: 0.089, rta: false };
  return { zip, ...hit };
}
