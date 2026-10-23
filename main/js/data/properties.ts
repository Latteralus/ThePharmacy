// /js/data/properties.ts - lease listings for a new pharmacy (Phase 10, #11
// and #12). The new-game screen offers these; the chosen one becomes the
// first location's building and lease (company.fromListing). Loaded by the
// main menu (index.html) as well as the game.
//
// Every address and landlord is invented. Rents are typical US asking
// rents for retail space in 2023: about $12-15 a square foot a year in a
// small town, $24-28 in the suburbs, $45-60 on a city street. A building
// comes as listed: changing its zones is a renovation (Phase 18).
//
// Customers follow foot traffic less each competitor's share
// (trafficFactor). Each area's default listing (defaultListing, for saves
// from before Phase 10) brings what that area used to: a suburban store
// 1x, a city one 1.3x, a small-town one 0.75x.

// A square foot of each zone holds this much
const SQFT_PER_SHELVING_BAY = 10; // one bay of shelving with its aisle
const SHELVES_PER_BAY = 5;

// Rent against a 3-year lease: a short lease costs more, a long one less
const LEASE_TERMS: Record<number, number> = { 1: 1.1, 3: 1, 5: 0.93 };
const DEFAULT_LEASE_YEARS = 3;

// Utilities and services a day: a flat part (licences, insurance, software,
// the claims network) and a part by floor space (power, water, cleaning,
// security, upkeep), dearer in a city. With the rent, a suburban store pays
// about what the old flat overhead was ($21,000 a month).
const SERVICES_FLAT = 350;
const SERVICES_PER_SQFT = 0.1;
const AREA_COSTS: Record<AreaType, number> = { urban: 1.15, suburban: 1, rural: 0.8 };

// Each competing pharmacy within a mile takes this share of customers
const COMPETITOR_SHARE = 0.06;

// The fixtures a building comes with, from its zone sizes: counters,
// benches, shelving and a fridge. They take floor space in their zone.
function fitOut(zones: Record<ZoneId, number>): Fixture[] {
    const fixtures: Fixture[] = [
        { name: 'Checkout counter', zone: 'frontStore', count: 1, sqft: 40 },
        { name: 'Waiting area seating', zone: 'frontStore', count: 1, sqft: 40 },
        { name: 'Over-the-counter shelving', zone: 'frontStore', count: Math.floor(zones.frontStore / 100), sqft: 12 },
        { name: 'Dispensing counter', zone: 'dispensing', count: 1, sqft: 60 },
        {
            name: 'Counting station',
            zone: 'dispensing',
            count: Math.max(1, Math.floor(zones.dispensing / 150)),
            sqft: 12,
        },
        { name: 'Will-call bins', zone: 'dispensing', count: 1, sqft: 20 },
        { name: 'Compounding bench', zone: 'lab', count: Math.max(1, Math.floor(zones.lab / 150)), sqft: 24 },
        { name: 'Lab sink', zone: 'lab', count: 1, sqft: 10 },
        {
            name: 'Shelving bay',
            zone: 'storage',
            count: Math.floor(zones.storage / SQFT_PER_SHELVING_BAY),
            sqft: SQFT_PER_SHELVING_BAY,
            shelves: SHELVES_PER_BAY,
        },
        { name: 'Pharmacy refrigerator', zone: 'coldStorage', count: 1, sqft: 10 },
    ];
    return fixtures.filter((f) => f.count > 0 && zones[f.zone] > 0);
}

function listedBuilding(type: string, zones: Omit<Record<ZoneId, number>, 'cleanroom'>): Building {
    const all = { ...zones, cleanroom: 0 };
    const sqft = Object.values(all).reduce((sum, n) => sum + n, 0);
    return { type, sqft, zones: all, fixtures: fitOut(all) };
}

const LISTINGS: PropertyListing[] = [
    {
        id: 'maple-grove',
        address: 'Maple Grove Plaza, Unit 4',
        area: 'suburban',
        building: listedBuilding('Strip-mall storefront', {
            frontStore: 800,
            dispensing: 350,
            lab: 300,
            storage: 450,
            coldStorage: 100,
        }),
        footTraffic: 1.15,
        competitors: 2,
        rentPerSqftYear: 27,
        description:
            'Between a grocery store and a dentist, with plenty of parking. A chain pharmacy sits in the grocery.',
    },
    {
        id: 'oak-street',
        address: '1420 Oak Street',
        area: 'suburban',
        building: listedBuilding('Standalone corner pharmacy', {
            frontStore: 1000,
            dispensing: 450,
            lab: 400,
            storage: 600,
            coldStorage: 150,
        }),
        footTraffic: 1.05,
        competitors: 1,
        rentPerSqftYear: 24,
        description: 'A former pharmacy on a busy corner, with a drive-through window and room to grow.',
    },
    {
        id: 'market-street',
        address: '212 Market Street',
        area: 'urban',
        building: listedBuilding('Street-level storefront', {
            frontStore: 550,
            dispensing: 300,
            lab: 250,
            storage: 300,
            coldStorage: 100,
        }),
        footTraffic: 1.6,
        competitors: 3,
        rentPerSqftYear: 58,
        description:
            'Downtown, near the train station. Crowded and expensive, with three pharmacies within a few blocks.',
    },
    {
        id: 'medical-arts',
        address: 'Medical Arts Building, Suite 110',
        area: 'urban',
        building: listedBuilding('Medical-office suite', {
            frontStore: 450,
            dispensing: 400,
            lab: 450,
            storage: 400,
            coldStorage: 100,
        }),
        footTraffic: 1.35,
        competitors: 1,
        rentPerSqftYear: 46,
        description: 'On the ground floor under twenty doctors’ offices. A small front, a large lab.',
    },
    {
        id: 'cedar-falls',
        address: '38 Main Street, Cedar Falls',
        area: 'rural',
        building: listedBuilding('Downtown storefront', {
            frontStore: 850,
            dispensing: 350,
            lab: 350,
            storage: 550,
            coldStorage: 100,
        }),
        footTraffic: 0.75,
        competitors: 0,
        rentPerSqftYear: 14,
        description: 'The only pharmacy in town since the last one closed. Cheap, roomy and quiet.',
    },
    {
        id: 'route-9',
        address: 'Route 9 Shopping Center, Unit 2',
        area: 'rural',
        building: listedBuilding('Strip-mall storefront', {
            frontStore: 700,
            dispensing: 300,
            lab: 300,
            storage: 400,
            coldStorage: 100,
        }),
        footTraffic: 0.75,
        competitors: 1,
        rentPerSqftYear: 12,
        description: 'On the highway between two towns, next to a discount store. The cheapest rent on offer.',
    },
];

// The listing an older save's area type gets (save v10 migration)
const DEFAULT_LISTING_FOR_AREA: Record<AreaType, string> = {
    suburban: 'maple-grove',
    urban: 'market-street',
    rural: 'cedar-falls',
};

window.properties = {
    listings: LISTINGS,
    LEASE_YEARS: Object.keys(LEASE_TERMS).map(Number),
    DEFAULT_LEASE_YEARS,

    find(id) {
        return LISTINGS.find((l) => l.id === id);
    },

    defaultListing(area) {
        return LISTINGS.find((l) => l.id === DEFAULT_LISTING_FOR_AREA[area]) ?? LISTINGS[0];
    },

    monthlyRent(listing, termYears) {
        const factor = LEASE_TERMS[termYears] ?? 1;
        return Math.round((listing.building.sqft * listing.rentPerSqftYear * factor) / 12);
    },

    servicesPerDay(area, sqft) {
        return Math.round((SERVICES_FLAT + SERVICES_PER_SQFT * sqft) * (AREA_COSTS[area] ?? 1));
    },

    trafficFactor(footTraffic, competitors) {
        return footTraffic * Math.max(0, 1 - COMPETITOR_SHARE * competitors);
    },

    shelves(building) {
        return building.fixtures
            .filter((f) => f.zone === 'storage')
            .reduce((sum, f) => sum + f.count * (f.shelves ?? 0), 0);
    },
};
