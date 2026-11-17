import { describe, expect, it } from "vitest";
import {
  comparisonPath,
  decodeCar,
  decodeComparison,
  detailPath,
  encodeComparison,
  type Comparison,
} from "@/lib/share";

const comparison: Comparison = {
  cars: [
    { key: "2016-toyota-corolla-le", mileage: 74200, price: 14200 },
    { key: "2015-ford-focus-se", mileage: 81500, price: 8900 },
    { key: "2017-honda-civic", mileage: 68400, price: 15900 }, // "Not sure" trim -> model key
  ],
  zip: "98201",
  annualMiles: 12000,
};

describe("share links", () => {
  it("round-trips a comparison through the URL", () => {
    const qs = encodeComparison(comparison);
    expect(decodeComparison(new URLSearchParams(qs))).toEqual(comparison);
  });

  it("produces a short, readable link", () => {
    expect(encodeComparison(comparison)).toBe(
      "cars=2016-toyota-corolla-le.74200.14200~2015-ford-focus-se.81500.8900~2017-honda-civic.68400.15900&zip=98201",
    );
  });

  it("only includes miles when it isn't the default", () => {
    expect(encodeComparison({ ...comparison, annualMiles: 15000 })).toContain("miles=15000");
  });

  it("decodes from Next.js searchParams objects too", () => {
    const decoded = decodeComparison({ cars: "2016-toyota-corolla-le.74200.14200", zip: "98201", miles: ["9000"] });
    expect(decoded.cars).toHaveLength(1);
    expect(decoded.annualMiles).toBe(9000);
  });

  it("drops broken car tokens but keeps the good ones", () => {
    const decoded = decodeComparison(
      new URLSearchParams("cars=2016-toyota-corolla-le.74200.14200~BAD..~2015-ford-focus-se.abc.8900~x.1.999999999&zip=98201"),
    );
    expect(decoded.cars.map((c) => c.key)).toEqual(["2016-toyota-corolla-le"]);
  });

  it("caps a comparison at 3 cars", () => {
    const four = [...comparison.cars, { key: "2018-toyota-camry-le", mileage: 58000, price: 20500 }];
    const qs = encodeComparison({ ...comparison, cars: four });
    expect(decodeComparison(new URLSearchParams(qs)).cars).toHaveLength(3);
  });

  it("rejects bad ZIPs and out-of-range miles", () => {
    const d = decodeComparison(new URLSearchParams("cars=&zip=9820&miles=999999"));
    expect(d.zip).toBe("");
    expect(d.annualMiles).toBe(12000);
    expect(d.cars).toEqual([]);
  });

  it("rejects keys with unsafe characters", () => {
    expect(decodeCar("../etc.1.1000")).toBeNull();
    expect(decodeCar("<script>.1.1000")).toBeNull();
    expect(decodeCar("2016-toyota-corolla-le.74200.14200")).not.toBeNull();
  });

  it("builds compare and detail paths", () => {
    expect(comparisonPath(comparison).startsWith("/compare?cars=")).toBe(true);
    expect(detailPath(comparison.cars[0], "98201", 12000)).toBe(
      "/car/2016-toyota-corolla-le?mileage=74200&price=14200&zip=98201",
    );
  });
});
