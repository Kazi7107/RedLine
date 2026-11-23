import { describe, expect, it } from "vitest";
import {
  categorizeComplaint,
  complaintSummary,
  countComplaints,
  matchTrim,
  normalizeRecall,
  normalizeRecalls,
  parseNhtsaDate,
} from "@/lib/sources/nhtsa-normalize";

describe("categorizeComplaint", () => {
  it("maps NHTSA component names to our categories", () => {
    expect(categorizeComplaint({ components: "POWER TRAIN" })).toBe("transmission");
    expect(categorizeComplaint({ components: "SERVICE BRAKES, HYDRAULIC" })).toBe("brakes");
    expect(categorizeComplaint({ components: "AIR BAGS" })).toBe("airbags");
    expect(categorizeComplaint({ components: "HYBRID PROPULSION SYSTEM" })).toBe("hybrid-system");
    expect(categorizeComplaint({ components: "LATCHES/LOCKS/LINKAGES" })).toBe("body");
  });

  it("uses the component listed first, even when names contain commas", () => {
    expect(categorizeComplaint({ components: "FUEL SYSTEM, GASOLINE,ENGINE" })).toBe("fuel-system");
    expect(categorizeComplaint({ components: "ELECTRICAL SYSTEM,POWER TRAIN" })).toBe("electrical");
  });

  it("reads the owner's words when the component is unknown", () => {
    expect(categorizeComplaint({ components: "UNKNOWN OR OTHER", summary: "really bad shifting issues" })).toBe("transmission");
    expect(categorizeComplaint({ components: "UNKNOWN OR OTHER", summary: "The A/C blows warm air" })).toBe("ac-heat");
    expect(categorizeComplaint({ components: "UNKNOWN OR OTHER", summary: "Paint is peeling" })).toBeNull();
  });
});

describe("countComplaints and complaintSummary", () => {
  const list = [
    { components: "POWER TRAIN" },
    { components: "POWER TRAIN,ENGINE" },
    { components: "POWER TRAIN" },
    { components: "ELECTRICAL SYSTEM" },
    { components: "UNKNOWN OR OTHER", summary: "no idea" },
  ];

  it("counts each complaint once and skips the ones we can't place", () => {
    expect(countComplaints(list)).toEqual({ transmission: 3, electrical: 1 });
  });

  it("says what owners complain about most", () => {
    expect(complaintSummary({ transmission: 3, electrical: 1 })).toBe("75% of owner complaints are about transmission, then electrical.");
    expect(complaintSummary({ engine: 3, brakes: 3, body: 2, steering: 2 })).toMatch(/^Owner complaints are spread out, led by/);
    expect(complaintSummary({})).toMatch(/Very few/);
  });

  it("keeps acronyms in the summary", () => {
    expect(complaintSummary({ "ac-heat": 5 })).toBe("100% of owner complaints are about AC and heat.");
  });
});

describe("recalls", () => {
  const raw = {
    NHTSACampaignNumber: "18V735000",
    Component: "FUEL SYSTEM, GASOLINE:STORAGE",
    Summary:
      "Ford Motor Company (Ford) is recalling certain 2012-2018 Ford Focus vehicles. The Canister Purge Valve may malfunction, causing excessive vacuum.",
    Remedy: "Ford will notify owners. Dealers will reprogram the Powertrain Control Module, free of charge.",
    ReportReceivedDate: "23/10/2018",
  };

  it("parses NHTSA's DD/MM/YYYY dates", () => {
    expect(parseNhtsaDate("23/10/2018")).toBe("2018-10-23");
    expect(parseNhtsaDate(undefined)).toBe("");
  });

  it("writes a short title and a what's-wrong-plus-fix summary", () => {
    const r = normalizeRecall(raw);
    expect(r.id).toBe("18V735000");
    expect(r.title).toBe("Fuel system: storage");
    expect(r.component).toBe("Fuel system");
    expect(r.summary).toBe("The Canister Purge Valve may malfunction, causing excessive vacuum. Dealers will reprogram the Powertrain Control Module, free of charge.");
    expect(r.reportedAt).toBe("2018-10-23");
  });

  it("dedupes by campaign and sorts newest first", () => {
    const older = { ...raw, NHTSACampaignNumber: "15V001000", ReportReceivedDate: "02/01/2015" };
    const out = normalizeRecalls([older, raw, raw]);
    expect(out.map((r) => r.id)).toEqual(["18V735000", "15V001000"]);
  });
});

describe("matchTrim", () => {
  it("matches vPIC's combined trims to ours, preferring the most common", () => {
    expect(matchTrim("L/LE", ["L", "LE", "S"], "LE")).toBe("LE");
    expect(matchTrim("LX", ["LX", "EX", "Sport"])).toBe("LX");
    expect(matchTrim("EX-L", ["LX", "Sport", "EX-L"])).toBe("EX-L");
    expect(matchTrim(null, ["LX"])).toBeNull();
    expect(matchTrim("Platinum", ["LX"])).toBeNull();
  });
});

describe("recall sentences", () => {
  it("doesn't split on decimals in engine sizes", () => {
    const r = normalizeRecall({
      NHTSACampaignNumber: "16V001000",
      Component: "ENGINE",
      Summary: "Ford is recalling certain 2015 Focus vehicles. Cars with the 1.0L GTDI engine may lose oil pressure.",
      Remedy: "Dealers will replace the oil pump, free of charge.",
      ReportReceivedDate: "01/02/2016",
    });
    expect(r.summary).toBe("Cars with the 1.0L GTDI engine may lose oil pressure. Dealers will replace the oil pump, free of charge.");
  });
});
