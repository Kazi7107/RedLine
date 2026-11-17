/** Client-safe descriptions of each data source. Shown on the landing page and /methodology. */
import type { SourceId } from "./data/types";

export interface SourceInfo {
  id: SourceId;
  name: string;
  short: string;
  gives: string;
  usedFor: string;
  refresh: string;
  url: string;
}

export const SOURCES: SourceInfo[] = [
  {
    id: "nhtsa",
    name: "NHTSA",
    short: "NHTSA",
    gives: "Recalls and owner complaints for each model year",
    usedFor: "Reliability score, recall list, complaint categories",
    refresh: "Weekly",
    url: "https://www.nhtsa.gov/recalls",
  },
  {
    id: "fueleconomy",
    name: "FuelEconomy.gov",
    short: "FuelEconomy.gov",
    gives: "Combined MPG for the exact trim and engine",
    usedFor: "Fuel cost",
    refresh: "Monthly",
    url: "https://www.fueleconomy.gov",
  },
  {
    id: "eia",
    name: "EIA",
    short: "EIA",
    gives: "Washington average retail gas price",
    usedFor: "Fuel cost",
    refresh: "Weekly",
    url: "https://www.eia.gov/petroleum/gasdiesel/",
  },
  {
    id: "aaa",
    name: "AAA Your Driving Costs",
    short: "AAA",
    gives: "Insurance, maintenance and repair averages by type of car",
    usedFor: "Insurance range, maintenance, repairs, value you lose",
    refresh: "Yearly",
    url: "https://newsroom.aaa.com/tag/your-driving-costs/",
  },
  {
    id: "wa-dol",
    name: "WA Department of Licensing",
    short: "WA DOL",
    gives: "Registration, title and plate fees",
    usedFor: "Taxes and registration",
    refresh: "Yearly, or when fees change",
    url: "https://dol.wa.gov",
  },
  {
    id: "wa-dor",
    name: "WA Department of Revenue",
    short: "WA DOR",
    gives: "Sales tax rate for your ZIP, plus the Sound Transit (RTA) tax",
    usedFor: "Taxes and registration",
    refresh: "Quarterly",
    url: "https://dor.wa.gov",
  },
  {
    id: "marketcheck",
    name: "MarketCheck",
    short: "MarketCheck",
    gives: "What this trim and mileage is selling for right now",
    usedFor: "Value you lose, and whether the asking price is over market",
    refresh: "Daily",
    url: "https://www.marketcheck.com",
  },
];

export const SOURCE_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s])) as Record<SourceId, SourceInfo>;
