/**
 * Seeded mock data: 28 common used cars with realistic Washington numbers.
 *
 * These are *raw inputs* (MPG, prices, complaint counts), not finished
 * totals. Every total on the site is computed from them by lib/cost, so the
 * math is real even though the inputs are sample values.
 *
 * TODO(db): this file goes away. Its contents map to the reference tables
 * (vehicle_models, vehicle_trims, risk_flags) and cache tables
 * (nhtsa_cache, fueleconomy_cache, marketcheck_cache) in
 * supabase/migrations/0001_init.sql.
 */
import type { CategoryKey, ComplaintCategory, RiskFlag, VehicleClass } from "../../cost/types";

export interface SeedTrim {
  name: string;
  engine: string;
  mpg: number;
  /** Typical listing price at typicalMileage, as of fall 2026. */
  typicalPrice: number;
  typicalMileage: number;
  msrp: number;
  common?: boolean;
  /** A sample VIN the mock decoder knows. */
  vin?: string;
}

export interface SeedRecall {
  title: string;
  component: string;
  summary: string;
  reportedAt: string;
}

export interface SeedModel {
  year: number;
  make: string;
  model: string;
  vehicleClass: VehicleClass;
  resale: number;
  synthetic: boolean;
  germanLuxury?: boolean;
  unitsSold: number;
  complaints: Partial<Record<ComplaintCategory, number>>;
  complaintSummary: string;
  recalls: SeedRecall[];
  risks?: RiskFlag[];
  note: string;
  /** Categories we don't have enough data to price. Triggers the error state. */
  missing?: CategoryKey[];
  trims: SeedTrim[];
}

const HYBRID_BATTERY = (probability: number, peakYear: number): RiskFlag => ({
  id: "hybrid-battery",
  component: "Hybrid battery",
  title: "The hybrid battery is near the end of its life",
  body: "Prius hybrid batteries usually last 10 to 15 years or 150,000 to 200,000 miles. On a car this age, a replacement is a real possibility while you own it.",
  costLow: 2000,
  costHigh: 4000,
  probability,
  peakYear,
  checkTip: "Ask for a hybrid battery health check during the inspection. Many shops can read the cell voltages in 20 minutes.",
});

export const SEED: SeedModel[] = [
  {
    year: 2017, make: "Honda", model: "Civic", vehicleClass: "compact", resale: 0.9, synthetic: true, unitsSold: 377000,
    complaints: { "ac-heat": 210, electrical: 160, engine: 55, transmission: 30, body: 40, brakes: 30, steering: 25, airbags: 30 },
    complaintSummary: "The AC condenser failing and the touchscreen freezing. Annoying, but rarely expensive.",
    recalls: [
      { title: "Fuel pump may fail", component: "Fuel system", summary: "The low-pressure fuel pump can stop working and stall the engine. Free fix at any Honda dealer.", reportedAt: "2020-06-02" },
      { title: "Rear view camera image may not show", component: "Electrical", summary: "A software issue can blank the backup camera. Free software update at any Honda dealer.", reportedAt: "2021-03-18" },
    ],
    note: "Solid all-rounder. Owner complaints are mostly annoying stuff, not engine or transmission.",
    trims: [
      { name: "LX", engine: "2.0L CVT", mpg: 34, typicalPrice: 15900, typicalMileage: 68400, msrp: 19700, common: true, vin: "19XFC2F59HE012345" },
      { name: "EX", engine: "1.5L turbo CVT", mpg: 36, typicalPrice: 17200, typicalMileage: 62000, msrp: 22600 },
      { name: "Sport", engine: "2.0L manual", mpg: 32, typicalPrice: 16800, typicalMileage: 60000, msrp: 21300 },
    ],
  },
  {
    year: 2018, make: "Honda", model: "Civic", vehicleClass: "compact", resale: 0.9, synthetic: true, unitsSold: 325000,
    complaints: { "ac-heat": 150, electrical: 120, engine: 70, transmission: 25, body: 30, brakes: 25, steering: 20, airbags: 20 },
    complaintSummary: "AC blowing warm air and some oil dilution on the 1.5L turbo in cold weather.",
    recalls: [
      { title: "Fuel pump may fail", component: "Fuel system", summary: "The low-pressure fuel pump can stop working and stall the engine. Free fix at any Honda dealer.", reportedAt: "2020-06-02" },
    ],
    note: "Same strong basics as the 2017 with a few fixes. The EX's turbo engine gets the best mileage.",
    trims: [
      { name: "LX", engine: "2.0L CVT", mpg: 34, typicalPrice: 16900, typicalMileage: 60000, msrp: 19500 },
      { name: "EX", engine: "1.5L turbo CVT", mpg: 36, typicalPrice: 18400, typicalMileage: 55000, msrp: 22300, common: true, vin: "SHHFK7H59JU123456" },
      { name: "Sport", engine: "2.0L CVT", mpg: 32, typicalPrice: 17900, typicalMileage: 52000, msrp: 21900 },
    ],
  },
  {
    year: 2016, make: "Toyota", model: "Corolla", vehicleClass: "compact", resale: 0.85, synthetic: false, unitsSold: 363000,
    complaints: { electrical: 30, airbags: 25, engine: 15, transmission: 12, brakes: 20, body: 18, steering: 10, "ac-heat": 15 },
    complaintSummary: "Very few. A handful of airbag warning lights and some road noise.",
    recalls: [
      { title: "Airbag inflator may rupture", component: "Airbags", summary: "The passenger airbag inflator can break apart in a crash. Free replacement at any Toyota dealer.", reportedAt: "2019-01-15" },
    ],
    note: "Boring in the best way. Cheap to run and the least likely to surprise you with a big bill.",
    trims: [
      { name: "L", engine: "1.8L 4-speed auto", mpg: 30, typicalPrice: 12900, typicalMileage: 80000, msrp: 17900 },
      { name: "LE", engine: "1.8L CVT", mpg: 32, typicalPrice: 14200, typicalMileage: 74200, msrp: 19000, common: true, vin: "2T1BURHE5GC512345" },
      { name: "S", engine: "1.8L CVT", mpg: 31, typicalPrice: 14800, typicalMileage: 70000, msrp: 20900 },
    ],
  },
  {
    year: 2015, make: "Ford", model: "Focus", vehicleClass: "compact", resale: 1.2, synthetic: false, unitsSold: 202000,
    complaints: { transmission: 1250, engine: 60, electrical: 260, steering: 120, body: 110, brakes: 40, "ac-heat": 30, "fuel-system": 30 },
    complaintSummary: "Shuddering from a stop, slipping between gears, hesitation when pulling out. If you test drive it, try slow stop-and-go traffic.",
    recalls: [
      { title: "Fuel vapor valve can cause stalling", component: "Fuel system", summary: "A stuck purge valve can make the engine stall or the fuel gauge read wrong. Free fix at any Ford dealer.", reportedAt: "2018-10-04" },
      { title: "Door may not stay latched", component: "Body", summary: "A latch part can wear out so a door looks closed but isn't. Free fix at any Ford dealer.", reportedAt: "2017-04-21" },
      { title: "Transmission input shaft seal may leak", component: "Transmission", summary: "Fluid can leak onto the clutch and cause shudder. Free seal replacement at any Ford dealer.", reportedAt: "2016-09-12" },
      { title: "Steering column clock spring may fail", component: "Steering", summary: "The driver airbag and horn may stop working. Free fix at any Ford dealer.", reportedAt: "2019-07-30" },
    ],
    risks: [
      {
        id: "powershift",
        component: "Transmission",
        title: "Known transmission trouble",
        body: "This Focus uses Ford's PowerShift automatic. Clutch packs and the control module wear out early, and owners report shudder, slipping and sudden loss of power. A clutch and module job usually runs $1,800 to $4,200.",
        costLow: 1800,
        costHigh: 4200,
        probability: 0.55,
        peakYear: 2,
        checkTip: "Ask for receipts showing the clutch or transmission control module was replaced. Test drive in slow stop-and-go traffic and feel for shudder.",
      },
    ],
    note: "Cheapest sticker, priciest to own. The automatic transmission is a known trouble spot, so repairs could run high.",
    trims: [
      { name: "S", engine: "2.0L auto", mpg: 31, typicalPrice: 7400, typicalMileage: 90000, msrp: 17200 },
      { name: "SE", engine: "2.0L auto", mpg: 31, typicalPrice: 8900, typicalMileage: 81500, msrp: 19400, common: true, vin: "1FADP3F28FL123456" },
      { name: "Titanium", engine: "2.0L auto", mpg: 30, typicalPrice: 9900, typicalMileage: 76000, msrp: 23500 },
    ],
  },
  {
    year: 2018, make: "Toyota", model: "Camry", vehicleClass: "midsize", resale: 0.85, synthetic: true, unitsSold: 343000,
    complaints: { transmission: 70, electrical: 60, engine: 25, brakes: 30, body: 25, "fuel-system": 20, steering: 15, "ac-heat": 30 },
    complaintSummary: "Some rough shifting at low speed and a few infotainment glitches.",
    recalls: [
      { title: "Fuel pump may fail", component: "Fuel system", summary: "The fuel pump impeller can swell and stop the pump. Free fix at any Toyota dealer.", reportedAt: "2020-03-27" },
      { title: "Brake booster pump may fail", component: "Brakes", summary: "Braking assistance can drop, making the pedal feel hard. Free fix at any Toyota dealer.", reportedAt: "2021-08-11" },
    ],
    note: "Roomy, comfortable and very dependable. Costs a bit more to insure than a compact.",
    trims: [
      { name: "LE", engine: "2.5L 8-speed auto", mpg: 32, typicalPrice: 20500, typicalMileage: 58000, msrp: 24900, common: true, vin: "4T1B11HK5JU123456" },
      { name: "SE", engine: "2.5L 8-speed auto", mpg: 32, typicalPrice: 21500, typicalMileage: 56000, msrp: 26200 },
      { name: "XLE", engine: "2.5L 8-speed auto", mpg: 31, typicalPrice: 23500, typicalMileage: 52000, msrp: 29600 },
    ],
  },
  {
    year: 2017, make: "Honda", model: "Accord", vehicleClass: "midsize", resale: 0.9, synthetic: false, unitsSold: 322000,
    complaints: { electrical: 120, "ac-heat": 60, engine: 40, transmission: 25, brakes: 30, body: 20, steering: 15, airbags: 10 },
    complaintSummary: "Battery drain and starter issues show up most. Engine and transmission are solid.",
    recalls: [
      { title: "Battery sensor may short", component: "Electrical", summary: "Water can get into the battery sensor and cause a short. Free fix at any Honda dealer.", reportedAt: "2018-08-31" },
      { title: "Fuel pump may fail", component: "Fuel system", summary: "The low-pressure fuel pump can stop working and stall the engine. Free fix at any Honda dealer.", reportedAt: "2020-06-02" },
    ],
    note: "A big, reliable sedan for compact money. Gas is the largest cost here.",
    trims: [
      { name: "LX", engine: "2.4L CVT", mpg: 30, typicalPrice: 16500, typicalMileage: 74000, msrp: 22500 },
      { name: "Sport", engine: "2.4L CVT", mpg: 29, typicalPrice: 17400, typicalMileage: 71000, msrp: 24400, common: true },
      { name: "EX-L", engine: "2.4L CVT", mpg: 30, typicalPrice: 18500, typicalMileage: 68000, msrp: 28700 },
    ],
  },
  {
    year: 2015, make: "Ford", model: "F-150", vehicleClass: "pickup-full", resale: 0.95, synthetic: true, unitsSold: 600000,
    complaints: { engine: 140, transmission: 150, electrical: 180, body: 120, brakes: 60, steering: 40, "ac-heat": 30 },
    complaintSummary: "Rough shifts from the 6-speed, some cam phaser rattle on the 3.5L, and tailgate latch issues.",
    recalls: [
      { title: "Transmission may downshift unexpectedly", component: "Transmission", summary: "A sensor issue can drop the truck into first gear at speed. Free fix at any Ford dealer.", reportedAt: "2019-09-05" },
      { title: "Seat belt pretensioner may cause fire", component: "Seat belts", summary: "Sparks from the pretensioner can ignite carpet insulation. Free fix at any Ford dealer.", reportedAt: "2018-09-06" },
      { title: "Brake master cylinder may leak", component: "Brakes", summary: "Fluid can leak into the booster and reduce braking. Free fix at any Ford dealer.", reportedAt: "2019-03-14" },
      { title: "Tailgate may open unexpectedly", component: "Body", summary: "Water can short the tailgate release. Free fix at any Ford dealer.", reportedAt: "2020-02-20" },
    ],
    note: "Holds value well and hauls anything, but gas and tires cost a lot more than a car.",
    trims: [
      { name: "XL", engine: "3.5L V6 6-speed", mpg: 20, typicalPrice: 18500, typicalMileage: 105000, msrp: 27500 },
      { name: "XLT", engine: "2.7L EcoBoost 4x4", mpg: 20, typicalPrice: 22900, typicalMileage: 98000, msrp: 38000, common: true, vin: "1FTEW1EP5FFA12345" },
      { name: "Lariat", engine: "3.5L EcoBoost 4x4", mpg: 19, typicalPrice: 27500, typicalMileage: 92000, msrp: 46500 },
    ],
  },
  {
    year: 2016, make: "BMW", model: "3 Series", vehicleClass: "midsize", resale: 1.3, synthetic: true, germanLuxury: true, unitsSold: 70000,
    complaints: { engine: 60, electrical: 45, "ac-heat": 15, steering: 15, body: 10, brakes: 10, transmission: 5 },
    complaintSummary: "Oil leaks from the valve cover and oil filter housing, plus electric water pump failures.",
    recalls: [
      { title: "Airbag inflator may rupture", component: "Airbags", summary: "The passenger airbag inflator can break apart in a crash. Free replacement at any BMW dealer.", reportedAt: "2020-01-08" },
      { title: "Crankcase vent heater may overheat", component: "Engine", summary: "A wiring issue can overheat the heater and start a fire. Free fix at any BMW dealer.", reportedAt: "2018-10-11" },
      { title: "Fuel pump connector may fail", component: "Fuel system", summary: "A loose connector can stall the engine. Free fix at any BMW dealer.", reportedAt: "2019-05-23" },
    ],
    risks: [
      {
        id: "oil-leaks",
        component: "Engine",
        title: "Oil leaks are common at this age",
        body: "The valve cover and oil filter housing gaskets on this engine tend to leak after 70,000 miles. Fixing both is a few hours of labor at BMW rates.",
        costLow: 900,
        costHigh: 2200,
        probability: 0.6,
        peakYear: 2,
        checkTip: "Look under the car and around the engine for oil. Ask whether the gaskets have been replaced.",
      },
    ],
    note: "Feels like a lot of car for the price, but German luxury repairs cost 40 to 50% more than a Camry's.",
    trims: [
      { name: "320i", engine: "2.0L turbo 8-speed", mpg: 27, typicalPrice: 13900, typicalMileage: 82000, msrp: 34200 },
      { name: "328i", engine: "2.0L turbo 8-speed", mpg: 27, typicalPrice: 15500, typicalMileage: 78000, msrp: 39500, common: true },
      { name: "340i", engine: "3.0L turbo 8-speed", mpg: 24, typicalPrice: 19900, typicalMileage: 72000, msrp: 47000 },
    ],
  },
  {
    year: 2014, make: "Toyota", model: "Prius", vehicleClass: "hybrid", resale: 0.9, synthetic: false, unitsSold: 122000,
    complaints: { "hybrid-system": 120, engine: 80, electrical: 90, brakes: 70, body: 40, "ac-heat": 30, steering: 20 },
    complaintSummary: "Hybrid battery warnings, headlight failures and some oil burning on high-mileage cars.",
    recalls: [
      { title: "Hybrid system may shut down", component: "Hybrid system", summary: "Software can overheat transistors and put the car in limp mode. Free update at any Toyota dealer.", reportedAt: "2014-02-12" },
      { title: "Inverter may fail", component: "Hybrid system", summary: "The inverter can fail and stall the car while driving. Free fix at any Toyota dealer.", reportedAt: "2018-10-05" },
    ],
    risks: [HYBRID_BATTERY(0.45, 3)],
    note: "Amazing gas mileage, but at this age the hybrid battery is the big question mark.",
    trims: [
      { name: "Two", engine: "1.8L hybrid", mpg: 50, typicalPrice: 11900, typicalMileage: 128000, msrp: 24200, common: true, vin: "JTDKN3DU5E1234567" },
      { name: "Three", engine: "1.8L hybrid", mpg: 50, typicalPrice: 12900, typicalMileage: 121000, msrp: 26800 },
    ],
  },
  {
    year: 2015, make: "Toyota", model: "Prius", vehicleClass: "hybrid", resale: 0.9, synthetic: false, unitsSold: 114000,
    complaints: { "hybrid-system": 90, engine: 60, electrical: 80, brakes: 60, body: 40, "ac-heat": 30, steering: 20 },
    complaintSummary: "Hybrid battery warnings and some headlight failures. Brakes can feel grabby at low speed.",
    recalls: [
      { title: "Inverter may fail", component: "Hybrid system", summary: "The inverter can fail and stall the car while driving. Free fix at any Toyota dealer.", reportedAt: "2018-10-05" },
    ],
    risks: [HYBRID_BATTERY(0.35, 4)],
    note: "Gas is almost nothing. Budget for the chance of a hybrid battery in the next few years.",
    trims: [
      { name: "Two", engine: "1.8L hybrid", mpg: 50, typicalPrice: 13200, typicalMileage: 112000, msrp: 24200 },
      { name: "Three", engine: "1.8L hybrid", mpg: 50, typicalPrice: 14200, typicalMileage: 106000, msrp: 26800, common: true },
      { name: "Four", engine: "1.8L hybrid", mpg: 48, typicalPrice: 15500, typicalMileage: 99000, msrp: 29500 },
    ],
  },
  {
    year: 2010, make: "Toyota", model: "Prius", vehicleClass: "hybrid", resale: 0.95, synthetic: false, unitsSold: 140000,
    complaints: { "hybrid-system": 200, engine: 300, brakes: 380, electrical: 320, body: 120, "ac-heat": 80, steering: 100 },
    complaintSummary: "Oil burning from the EGR system, headlights going out and brakes that briefly let go over bumps.",
    recalls: [
      { title: "Brakes may briefly lose grip over bumps", component: "Brakes", summary: "Software makes the ABS release briefly on rough roads. Free update at any Toyota dealer.", reportedAt: "2010-02-09" },
      { title: "Steering shaft may loosen", component: "Steering", summary: "A loose nut can make steering feel off. Free fix at any Toyota dealer.", reportedAt: "2010-08-26" },
      { title: "Inverter may fail", component: "Hybrid system", summary: "The inverter can fail and stall the car while driving. Free fix at any Toyota dealer.", reportedAt: "2018-10-05" },
    ],
    risks: [HYBRID_BATTERY(0.6, 2)],
    note: "Cheap and still sips gas, but it's old enough that both the battery and engine need a close look.",
    trims: [
      { name: "Two", engine: "1.8L hybrid", mpg: 50, typicalPrice: 8400, typicalMileage: 168000, msrp: 22800, common: true },
    ],
  },
  {
    year: 2019, make: "Mazda", model: "CX-5", vehicleClass: "compact-suv", resale: 1.0, synthetic: false, unitsSold: 154000,
    complaints: { electrical: 60, brakes: 40, body: 25, engine: 20, transmission: 10, "ac-heat": 15, steering: 10 },
    complaintSummary: "The automatic emergency braking sometimes triggers for no reason. Very little else.",
    recalls: [
      { title: "Smart brake system may activate on its own", component: "Brakes", summary: "The car can brake hard for no reason. Free software update at any Mazda dealer.", reportedAt: "2019-12-05" },
    ],
    note: "Feels more expensive than it is. AWD costs a little in gas but helps over the passes.",
    trims: [
      { name: "Sport", engine: "2.5L FWD", mpg: 28, typicalPrice: 19500, typicalMileage: 68000, msrp: 25400 },
      { name: "Touring", engine: "2.5L AWD", mpg: 26, typicalPrice: 21400, typicalMileage: 64000, msrp: 29000, common: true, vin: "JM3KFBCM5K0123456" },
      { name: "Grand Touring", engine: "2.5L AWD", mpg: 26, typicalPrice: 23800, typicalMileage: 58000, msrp: 32800 },
    ],
  },
  {
    year: 2018, make: "Toyota", model: "RAV4", vehicleClass: "compact-suv", resale: 0.85, synthetic: true, unitsSold: 379000,
    complaints: { electrical: 90, transmission: 60, body: 50, engine: 30, brakes: 40, "ac-heat": 30, steering: 20 },
    complaintSummary: "A few rough shifts and some interior rattles. Nothing that tends to get expensive.",
    recalls: [
      { title: "Rear seat belt may not hold", component: "Seat belts", summary: "The rear seat frame can cut the belt in a crash. Free fix at any Toyota dealer.", reportedAt: "2016-10-26" },
    ],
    note: "The safe pick for an SUV. Holds its value and rarely breaks.",
    trims: [
      { name: "LE", engine: "2.5L AWD", mpg: 25, typicalPrice: 19900, typicalMileage: 78000, msrp: 26800 },
      { name: "XLE", engine: "2.5L AWD", mpg: 25, typicalPrice: 21500, typicalMileage: 72000, msrp: 28800, common: true },
    ],
  },
  {
    year: 2018, make: "Toyota", model: "RAV4 Hybrid", vehicleClass: "compact-suv", resale: 0.85, synthetic: true, unitsSold: 48000,
    complaints: { electrical: 20, brakes: 15, body: 10, "hybrid-system": 5, "ac-heat": 5, steering: 5 },
    complaintSummary: "Very few. Some brake feel complaints, which is common with hybrids.",
    recalls: [
      { title: "Rear seat belt may not hold", component: "Seat belts", summary: "The rear seat frame can cut the belt in a crash. Free fix at any Toyota dealer.", reportedAt: "2016-10-26" },
    ],
    note: "Costs more up front than the gas RAV4, but the mileage pays some of that back.",
    trims: [
      { name: "XLE", engine: "2.5L hybrid AWD", mpg: 32, typicalPrice: 23900, typicalMileage: 69000, msrp: 30700, common: true },
      { name: "Limited", engine: "2.5L hybrid AWD", mpg: 32, typicalPrice: 26500, typicalMileage: 62000, msrp: 34600 },
    ],
  },
  {
    year: 2017, make: "Toyota", model: "Tacoma", vehicleClass: "pickup-midsize", resale: 0.6, synthetic: true, unitsSold: 198000,
    complaints: { transmission: 230, engine: 40, electrical: 70, body: 80, brakes: 40, steering: 30, suspension: 30 },
    complaintSummary: "The transmission hunts for gears on hills. Annoying, but rarely a failure.",
    recalls: [
      { title: "Rear axle bolts may loosen", component: "Suspension", summary: "Loose bolts can let the axle shift. Free fix at any Toyota dealer.", reportedAt: "2019-02-14" },
      { title: "Throttle body may stick", component: "Engine", summary: "The throttle can open more than it should. Free fix at any Toyota dealer.", reportedAt: "2017-07-18" },
    ],
    note: "You pay a lot up front, but a Tacoma loses value slower than almost anything on the road.",
    trims: [
      { name: "SR5", engine: "3.5L V6 4x4", mpg: 19, typicalPrice: 28500, typicalMileage: 88000, msrp: 33500, common: true },
      { name: "TRD Off-Road", engine: "3.5L V6 4x4", mpg: 19, typicalPrice: 31500, typicalMileage: 82000, msrp: 36500 },
    ],
  },
  {
    year: 2016, make: "Nissan", model: "Frontier", vehicleClass: "pickup-midsize", resale: 1.05, synthetic: false, unitsSold: 87000,
    complaints: { electrical: 25, body: 15, brakes: 15, engine: 15, transmission: 10, steering: 5, "ac-heat": 5 },
    complaintSummary: "Few complaints. Some dash electrical gremlins.",
    recalls: [
      { title: "Passenger airbag may not deploy", component: "Airbags", summary: "The occupant sensor can turn the airbag off. Free fix at any Nissan dealer.", reportedAt: "2017-01-12" },
    ],
    note: "Old-school and simple. Cheaper to buy than a Tacoma, thirstier on gas.",
    trims: [
      { name: "S", engine: "2.5L I4 2WD", mpg: 19, typicalPrice: 13500, typicalMileage: 102000, msrp: 19200 },
      { name: "SV", engine: "4.0L V6 4x4", mpg: 17, typicalPrice: 17900, typicalMileage: 96000, msrp: 29500, common: true },
    ],
  },
  {
    year: 2019, make: "Honda", model: "CR-V", vehicleClass: "compact-suv", resale: 0.9, synthetic: true, unitsSold: 384000,
    complaints: { engine: 420, electrical: 160, "ac-heat": 80, body: 60, brakes: 50, steering: 30, transmission: 20 },
    complaintSummary: "Gas mixing into the oil on the 1.5L turbo in cold climates. Honda extended the warranty for it.",
    recalls: [
      { title: "Fuel pump may fail", component: "Fuel system", summary: "The low-pressure fuel pump can stop working and stall the engine. Free fix at any Honda dealer.", reportedAt: "2020-06-02" },
      { title: "Rear seat belt may not latch", component: "Seat belts", summary: "The center rear belt buckle can be blocked. Free fix at any Honda dealer.", reportedAt: "2019-05-02" },
    ],
    note: "Huge inside and good on gas. The turbo's oil dilution is worth asking about.",
    trims: [
      { name: "LX", engine: "2.4L AWD", mpg: 28, typicalPrice: 21000, typicalMileage: 66000, msrp: 26800 },
      { name: "EX", engine: "1.5L turbo AWD", mpg: 29, typicalPrice: 22800, typicalMileage: 61000, msrp: 30000, common: true },
    ],
  },
  {
    year: 2017, make: "Subaru", model: "Outback", vehicleClass: "compact-suv", resale: 0.9, synthetic: true, unitsSold: 182000,
    complaints: { electrical: 110, "ac-heat": 40, body: 50, engine: 30, transmission: 30, brakes: 25, steering: 15 },
    complaintSummary: "Battery drain and windshield cracks show up most.",
    recalls: [
      { title: "Brake light switch may fail", component: "Electrical", summary: "Brake lights may stay off. Free fix at any Subaru dealer.", reportedAt: "2019-08-29" },
      { title: "Front axle may break", component: "Suspension", summary: "A heat-treat defect can crack the axle shaft. Free fix at any Subaru dealer.", reportedAt: "2018-04-19" },
    ],
    note: "The Washington classic for a reason. AWD standard and lots of room for gear.",
    trims: [
      { name: "2.5i", engine: "2.5L CVT AWD", mpg: 28, typicalPrice: 16900, typicalMileage: 90000, msrp: 25700 },
      { name: "2.5i Premium", engine: "2.5L CVT AWD", mpg: 28, typicalPrice: 17900, typicalMileage: 85000, msrp: 27700, common: true },
      { name: "3.6R Limited", engine: "3.6L CVT AWD", mpg: 22, typicalPrice: 20500, typicalMileage: 78000, msrp: 36500 },
    ],
  },
  {
    year: 2016, make: "Subaru", model: "Forester", vehicleClass: "compact-suv", resale: 0.9, synthetic: true, unitsSold: 175000,
    complaints: { engine: 120, electrical: 100, body: 50, "ac-heat": 40, brakes: 30, steering: 20, transmission: 20 },
    complaintSummary: "Some engines burn oil between changes. Check the dipstick before you buy.",
    recalls: [
      { title: "Front axle may break", component: "Suspension", summary: "A heat-treat defect can crack the axle shaft. Free fix at any Subaru dealer.", reportedAt: "2018-04-19" },
    ],
    note: "Great visibility and standard AWD. Ask whether it's been burning oil.",
    trims: [
      { name: "2.5i Premium", engine: "2.5L CVT AWD", mpg: 28, typicalPrice: 14900, typicalMileage: 92000, msrp: 25300, common: true },
    ],
  },
  {
    year: 2018, make: "Subaru", model: "Crosstrek", vehicleClass: "compact-suv", resale: 0.9, synthetic: true, unitsSold: 110000,
    complaints: { electrical: 50, "ac-heat": 20, body: 25, engine: 20, brakes: 15, transmission: 10 },
    complaintSummary: "Battery drain and some auto stop-start complaints.",
    recalls: [
      { title: "Brake light switch may fail", component: "Electrical", summary: "Brake lights may stay off. Free fix at any Subaru dealer.", reportedAt: "2019-08-29" },
    ],
    note: "Small, tough and efficient. A popular first car around here.",
    trims: [
      { name: "2.0i Premium", engine: "2.0L CVT AWD", mpg: 29, typicalPrice: 18200, typicalMileage: 63000, msrp: 23300, common: true },
      { name: "2.0i Limited", engine: "2.0L CVT AWD", mpg: 29, typicalPrice: 19800, typicalMileage: 57000, msrp: 27200 },
    ],
  },
  {
    year: 2017, make: "Hyundai", model: "Elantra", vehicleClass: "compact", resale: 1.1, synthetic: false, unitsSold: 198000,
    complaints: { electrical: 70, engine: 40, brakes: 40, steering: 30, body: 35, transmission: 25, "ac-heat": 20 },
    complaintSummary: "Steering coupler clunks and some electrical issues.",
    recalls: [
      { title: "Hood latch may corrode", component: "Body", summary: "The secondary latch can stick open. Free fix at any Hyundai dealer.", reportedAt: "2018-06-07" },
    ],
    note: "A lot of features for the money. Resale is weaker, so it loses value a bit faster.",
    trims: [
      { name: "SE", engine: "2.0L auto", mpg: 33, typicalPrice: 11900, typicalMileage: 79000, msrp: 18200, common: true },
      { name: "Value Edition", engine: "2.0L auto", mpg: 33, typicalPrice: 12800, typicalMileage: 74000, msrp: 20500 },
    ],
  },
  {
    year: 2016, make: "Mazda", model: "Mazda3", vehicleClass: "compact", resale: 1.0, synthetic: false, unitsSold: 107000,
    complaints: { electrical: 45, body: 25, brakes: 20, engine: 15, "ac-heat": 15, transmission: 10, steering: 10 },
    complaintSummary: "Infotainment screen ghost touches. Mechanically very solid.",
    recalls: [
      { title: "Parking brake may not hold", component: "Brakes", summary: "Corrosion can weaken the rear parking brake. Free fix at any Mazda dealer.", reportedAt: "2016-08-18" },
    ],
    note: "Fun to drive and frugal. A good alternative if Civics and Corollas feel overpriced.",
    trims: [
      { name: "i Sport", engine: "2.0L auto", mpg: 34, typicalPrice: 11800, typicalMileage: 88000, msrp: 18600, common: true },
      { name: "i Touring", engine: "2.0L auto", mpg: 33, typicalPrice: 12600, typicalMileage: 82000, msrp: 21500 },
    ],
  },
  {
    year: 2015, make: "Volkswagen", model: "Jetta", vehicleClass: "compact", resale: 1.15, synthetic: true, unitsSold: 160000,
    complaints: { engine: 120, transmission: 80, electrical: 150, body: 60, brakes: 40, "ac-heat": 40, steering: 30 },
    complaintSummary: "Water pump leaks, coolant loss and window regulator failures.",
    recalls: [
      { title: "Airbag clock spring may fail", component: "Airbags", summary: "The driver airbag may not deploy. Free fix at any Volkswagen dealer.", reportedAt: "2015-07-23" },
      { title: "Rear suspension trailing arm may break", component: "Suspension", summary: "Can affect handling after a crash. Free fix at any Volkswagen dealer.", reportedAt: "2016-05-12" },
      { title: "Fuel injector may leak", component: "Fuel system", summary: "A leaking injector can cause a fire risk. Free fix at any Volkswagen dealer.", reportedAt: "2017-03-09" },
    ],
    note: "Comfortable on the highway. Parts and labor cost a bit more than Japanese rivals.",
    trims: [
      { name: "S", engine: "2.0L auto", mpg: 28, typicalPrice: 7900, typicalMileage: 102000, msrp: 18200 },
      { name: "SE", engine: "1.8L turbo auto", mpg: 30, typicalPrice: 9200, typicalMileage: 96000, msrp: 21400, common: true },
    ],
  },
  {
    year: 2017, make: "Ford", model: "Escape", vehicleClass: "compact-suv", resale: 1.15, synthetic: true, unitsSold: 308000,
    complaints: { engine: 560, transmission: 120, electrical: 300, body: 120, brakes: 80, steering: 60, "ac-heat": 60 },
    complaintSummary: "Coolant leaking into the engine on the 1.5L turbo, which can crack the head if it isn't caught.",
    recalls: [
      { title: "Engine may overheat and catch fire", component: "Engine", summary: "A coolant leak can overheat the 1.5L engine. Free fix at any Ford dealer.", reportedAt: "2019-09-12" },
      { title: "Shifter cable bushing may detach", component: "Transmission", summary: "The car may not be in the gear the shifter shows. Free fix at any Ford dealer.", reportedAt: "2021-04-08" },
      { title: "Door may not stay latched", component: "Body", summary: "A latch part can wear out so a door looks closed but isn't. Free fix at any Ford dealer.", reportedAt: "2017-04-21" },
      { title: "Seat belt anchor may fail", component: "Seat belts", summary: "A front belt cable can separate. Free fix at any Ford dealer.", reportedAt: "2018-12-13" },
    ],
    risks: [
      {
        id: "coolant-intrusion",
        component: "Engine",
        title: "Coolant leaks on the 1.5L turbo",
        body: "Some 1.5L engines leak coolant into the cylinders. Caught early it's a gasket job; caught late it can mean a new engine.",
        costLow: 1500,
        costHigh: 6000,
        probability: 0.2,
        peakYear: 3,
        checkTip: "Ask if the coolant has needed topping off, and check for white exhaust smoke at startup.",
      },
    ],
    note: "Comfortable and cheap to buy. The 1.5L engine has a known coolant problem worth checking.",
    trims: [
      { name: "SE", engine: "1.5L turbo FWD", mpg: 26, typicalPrice: 12500, typicalMileage: 89000, msrp: 26200, common: true },
      { name: "Titanium", engine: "2.0L turbo AWD", mpg: 23, typicalPrice: 14900, typicalMileage: 82000, msrp: 31500 },
    ],
  },
  {
    year: 2016, make: "Chevrolet", model: "Malibu", vehicleClass: "midsize", resale: 1.15, synthetic: true, unitsSold: 227000,
    complaints: { electrical: 140, engine: 70, brakes: 50, steering: 40, body: 40, transmission: 30, "ac-heat": 20 },
    complaintSummary: "Stop-start glitches and some shifter issues.",
    recalls: [
      { title: "Brake pedal may feel soft", component: "Brakes", summary: "Software can reduce braking assist. Free update at any Chevrolet dealer.", reportedAt: "2017-11-02" },
      { title: "Shift to park message may be wrong", component: "Electrical", summary: "The car can show 'shift to park' when it's already parked. Free fix at any Chevrolet dealer.", reportedAt: "2019-04-25" },
    ],
    note: "Roomy and cheap to buy. Loses value faster than a Camry or Accord.",
    trims: [
      { name: "LT", engine: "1.5L turbo auto", mpg: 30, typicalPrice: 11900, typicalMileage: 87000, msrp: 25300, common: true },
    ],
  },
  {
    year: 2015, make: "Audi", model: "A4", vehicleClass: "midsize", resale: 1.3, synthetic: true, germanLuxury: true, unitsSold: 33000,
    complaints: { engine: 30, electrical: 25, "ac-heat": 10, body: 10, brakes: 8, steering: 5, transmission: 2 },
    complaintSummary: "Timing chain tensioner wear and water pump leaks.",
    recalls: [
      { title: "Airbag may not deploy", component: "Airbags", summary: "A wiring fault can disable the front airbags. Free fix at any Audi dealer.", reportedAt: "2016-03-31" },
      { title: "Coolant pump may overheat", component: "Engine", summary: "Debris can block the coolant pump and overheat it. Free fix at any Audi dealer.", reportedAt: "2017-05-18" },
    ],
    note: "Luxury for the price of a Civic, but every repair costs luxury money too.",
    trims: [
      { name: "2.0T Premium quattro", engine: "2.0L turbo AWD", mpg: 25, typicalPrice: 11500, typicalMileage: 98000, msrp: 37300, common: true },
    ],
  },
  {
    year: 2016, make: "Kia", model: "Soul", vehicleClass: "compact", resale: 1.1, synthetic: false, unitsSold: 145000,
    complaints: { engine: 110, electrical: 70, body: 40, brakes: 30, "ac-heat": 25, steering: 15, transmission: 10 },
    complaintSummary: "Some 2.0L engines burn oil or knock at high miles.",
    recalls: [
      { title: "Engine may be damaged by catalyst", component: "Engine", summary: "An overheating catalytic converter can damage the engine. Free fix at any Kia dealer.", reportedAt: "2020-03-04" },
    ],
    note: "Practical and roomy for a small car. Check the oil level and listen for engine knock.",
    trims: [
      { name: "+", engine: "2.0L auto", mpg: 27, typicalPrice: 10900, typicalMileage: 84000, msrp: 20000, common: true },
    ],
  },
  {
    year: 2009, make: "Saturn", model: "Astra", vehicleClass: "compact", resale: 1.2, synthetic: false, unitsSold: 8000,
    complaints: { electrical: 20, engine: 10, body: 10 },
    complaintSummary: "Too few reports to say.",
    recalls: [
      { title: "Daytime running lights may fail", component: "Electrical", summary: "A module can stop the lights from working. Free fix at a GM dealer.", reportedAt: "2010-04-15" },
    ],
    note: "Saturn closed in 2010, so parts and repair data are thin.",
    missing: ["repairs", "insurance"],
    trims: [
      { name: "XR", engine: "1.8L auto", mpg: 26, typicalPrice: 4500, typicalMileage: 132000, msrp: 17500, common: true },
    ],
  },
];
