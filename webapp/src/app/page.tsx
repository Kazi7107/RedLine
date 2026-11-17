/** Placeholder until the front end is built: lists the backend endpoints. */
const ENDPOINTS: [string, string][] = [
  ["GET /api/health", "Reachability of every upstream data source"],
  ["GET /api/vehicles/years", "Model years (FuelEconomy.gov)"],
  ["GET /api/vehicles/makes?year=2018", "Makes for a year"],
  ["GET /api/vehicles/models?year=2018&make=Honda", "Models for a year + make"],
  ["GET /api/vehicles/options?year=2018&make=Honda&model=Civic%204Dr", "Trims; value = EPA vehicle id"],
  ["GET /api/vehicles/39566", "Normalized vehicle spec (MPG, class, powertrain)"],
  ["GET /api/vin/{vin}", "Decode a VIN (NHTSA vPIC)"],
  ["GET /api/fuel-prices", "WA prices via EIA (with key) or national averages"],
  ["GET /api/safety?year=2018&make=Honda&model=Civic", "Recalls, complaints, star rating (NHTSA)"],
  ["GET /api/reference", "WA locations for tax/fee lookup"],
  ["POST /api/estimate", "{ epaId, inputs } → 5-year cost of ownership"],
];

export default function Home() {
  return (
    <main>
      <h1>Redline API</h1>
      <ul>
        {ENDPOINTS.map(([path, desc]) => (
          <li key={path}>
            <code>{path}</code> — {desc}
          </li>
        ))}
      </ul>
    </main>
  );
}
