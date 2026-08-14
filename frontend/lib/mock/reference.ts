// Static reference data for the seed generator (spec §9.2)

export interface City {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const CITIES: Record<string, City> = {
  Dallas: { city: "Dallas", state: "TX", lat: 32.7767, lng: -96.797 },
  Houston: { city: "Houston", state: "TX", lat: 29.7604, lng: -95.3698 },
  Austin: { city: "Austin", state: "TX", lat: 30.2672, lng: -97.7431 },
  Chicago: { city: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298 },
  Detroit: { city: "Detroit", state: "MI", lat: 42.3314, lng: -83.0458 },
  "New York": { city: "New York", state: "NY", lat: 40.7128, lng: -74.006 },
  Newark: { city: "Newark", state: "NJ", lat: 40.7357, lng: -74.1724 },
  Boston: { city: "Boston", state: "MA", lat: 42.3601, lng: -71.0589 },
  Atlanta: { city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388 },
  Charlotte: { city: "Charlotte", state: "NC", lat: 35.2271, lng: -80.8431 },
  "Los Angeles": { city: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437 },
  Phoenix: { city: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.074 },
};

// Realistic freight lanes with approx miles (spec §9.2)
export const LANES: { from: keyof typeof CITIES; to: keyof typeof CITIES; miles: number }[] = [
  { from: "Dallas", to: "Houston", miles: 239 },
  { from: "Chicago", to: "Detroit", miles: 283 },
  { from: "Newark", to: "Boston", miles: 224 },
  { from: "Los Angeles", to: "Phoenix", miles: 372 },
  { from: "Atlanta", to: "Charlotte", miles: 245 },
  { from: "Dallas", to: "Austin", miles: 195 },
  { from: "New York", to: "Boston", miles: 215 },
  { from: "Houston", to: "Dallas", miles: 239 },
];

export const BRANCH_CITIES = [
  "Dallas", "Chicago", "New York", "Newark", "Houston", "Atlanta", "Los Angeles",
] as const;

export const FACILITY_NAMES = [
  "Ridgeline Foods DC #4",
  "Harbor Point Grocery",
  "Cascade Distribution Center",
  "Ironwood Logistics Hub",
  "Summit Cold Storage",
  "Blue Line Freight Terminal",
  "Meridian Consumer Goods",
  "Cornerstone Warehousing",
  "Vanguard Retail DC",
  "Anchor Beverage Depot",
  "Northgate Building Supply",
  "Pinnacle Paper Products",
  "Evergreen Produce Market",
  "Redstone Manufacturing",
  "Coastal Import Terminal",
];

export const COMMODITIES = [
  "Palletized dry goods",
  "Refrigerated produce",
  "Canned beverages",
  "Building materials",
  "Paper products",
  "Consumer electronics",
  "Automotive parts",
  "Frozen foods",
  "Bottled water",
  "Packaged snacks",
];

export const HAZMAT_COMMODITIES = [
  { commodity: "Industrial solvents", unNumber: "UN1993", hazmatClass: "3", packingGroup: "II" },
  { commodity: "Compressed oxygen", unNumber: "UN1072", hazmatClass: "2.2", packingGroup: "—" },
  { commodity: "Lithium battery packs", unNumber: "UN3480", hazmatClass: "9", packingGroup: "II" },
];

export const SPECIAL_HANDLING = [
  "Liftgate",
  "Inside delivery",
  "Appointment required",
  "Team drivers",
  "Tarp required",
];

export const FIRST_NAMES = [
  "Miguel", "Aleksandra", "James", "Sarah", "David", "Maria", "Robert", "Linda",
  "Carlos", "Emily", "Anthony", "Nicole", "Kevin", "Rachel", "Brian", "Amanda",
  "Jason", "Melissa", "Eric", "Laura", "Daniel", "Jessica", "Marcus", "Angela",
  "Tyler", "Christine", "Andre", "Diana", "Victor", "Patricia", "Hassan", "Grace",
  "Omar", "Natalie", "Luis", "Karen", "Derek", "Sofia",
];

export const LAST_NAMES = [
  "Reyes", "Nowak", "Cole", "Chen", "Martinez", "Johnson", "Williams", "Brown",
  "Garcia", "Miller", "Davis", "Rodriguez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Lee", "Walker", "Hall", "Allen", "Young",
  "Hernandez", "King", "Wright", "Lopez", "Hill", "Scott", "Green", "Adams",
  "Baker", "Nguyen", "Carter", "Mitchell", "Perez", "Roberts", "Turner",
];

export const CARRIER_NAMES = [
  "Meridian Freight Lines",
  "Ironhorse Transport Co.",
  "Sunbelt Carriers",
  "Great Lakes Trucking",
];

export const BROKER_NAMES = [
  "Compass Logistics Group",
  "Beacon Freight Brokerage",
  "Keystone Load Partners",
];

export const SHIPPER_NAMES = [
  "Ridgeline Foods",
  "Harbor Point Grocery",
  "Vanguard Retail",
  "Anchor Beverage",
  "Northgate Building Supply",
];

export const TRUCK_MAKES = [
  { make: "Freightliner", model: "Cascadia" },
  { make: "Peterbilt", model: "579" },
  { make: "Kenworth", model: "T680" },
  { make: "Volvo", model: "VNL 760" },
  { make: "International", model: "LT625" },
];

export const TRAILER_MAKES = [
  { make: "Wabash", model: "DuraPlate 53'" },
  { make: "Utility", model: "3000R Reefer" },
  { make: "Great Dane", model: "Everest" },
  { make: "Hyundai", model: "Composite 53'" },
];
