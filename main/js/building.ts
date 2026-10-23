// building.js - the active location's building: its zones and what's in
// them (Phase 10, #11).
//
//   Front store   waiting area and over-the-counter shelving; how many
//                 customers fit in at once
//   Dispensing    the counter, counting stations, will-call bins
//   Lab           compounding equipment (EquipmentItem.zone and sqft)
//   Cleanroom     sterile compounding; none of the starting buildings has one
//   Storage       shelving bays; stock takes shelves (materials by the
//                 bottle, products by the box)
//   Cold storage  the pharmacy refrigerator
//
// Fixtures and equipment take floor space in their zone, and stock takes
// shelves in storage. Buying refuses what won't fit (refuseMaterials,
// refuseEquipment); what's already there stays, even over capacity.

const ZONES: ZoneId[] = ['frontStore', 'dispensing', 'lab', 'cleanroom', 'storage', 'coldStorage'];
const ZONE_LABELS: Record<ZoneId, string> = {
    frontStore: 'Front store',
    dispensing: 'Dispensing',
    lab: 'Lab',
    cleanroom: 'Cleanroom',
    storage: 'Storage',
    coldStorage: 'Cold storage',
};

// A shelf holds this many units of a material (a bottle or tub's worth) or
// of a finished product (a box of packed stock)
const MATERIAL_UNITS_PER_SHELF = 1000;
const PRODUCT_UNITS_PER_SHELF = 25;
// Floor space each customer in the front store needs, standing or seated
const SQFT_PER_CUSTOMER = 8;

type Order = Map<string, number> | Record<string, number>;

function orderEntries(order: Order): Array<[string, number]> {
    return order instanceof Map ? Array.from(order.entries()) : Object.entries(order);
}

window.building = (function (): BuildingApi {
    const current = (): Building => window.company.active().building;

    function fixtureSqft(zone: ZoneId): number {
        return current()
            .fixtures.filter((f) => f.zone === zone)
            .reduce((sum, f) => sum + f.count * f.sqft, 0);
    }

    function equipmentSqft(zone: ZoneId): number {
        return window.equipmentData
            .filter((eq) => (eq.zone ?? 'lab') === zone)
            .reduce((sum, eq) => sum + Math.max(0, eq.owned) * (eq.sqft ?? 0), 0);
    }

    function shelves(): number {
        return current()
            .fixtures.filter((f) => f.zone === 'storage')
            .reduce((sum, f) => sum + f.count * (f.shelves ?? 0), 0);
    }

    function materialShelves(material: Material, quantity = material.inventory): number {
        return quantity > 0 ? Math.ceil(quantity / MATERIAL_UNITS_PER_SHELF) : 0;
    }

    function productShelves(product: Product, quantity = product.inventory): number {
        return quantity > 0 ? Math.ceil(quantity / PRODUCT_UNITS_PER_SHELF) : 0;
    }

    function usedShelves(): number {
        const materials = window.materialsData.reduce((sum, m) => sum + materialShelves(m), 0);
        const products = window.productsData.reduce((sum, p) => sum + productShelves(p), 0);
        return materials + products;
    }

    function customerCapacity(): number {
        const free = current().zones.frontStore - fixtureSqft('frontStore');
        return Math.max(0, Math.floor(free / SQFT_PER_CUSTOMER));
    }

    function zone(id: ZoneId): ZoneUse {
        const use: ZoneUse = {
            zone: id,
            label: ZONE_LABELS[id],
            sqft: current().zones[id] ?? 0,
            usedSqft: fixtureSqft(id) + equipmentSqft(id),
        };
        if (id === 'storage') {
            use.shelves = shelves();
            use.usedShelves = usedShelves();
        }
        if (id === 'frontStore') use.customerCapacity = customerCapacity();
        return use;
    }

    function freeShelves(): number {
        return shelves() - usedShelves();
    }

    function freeSqft(id: ZoneId): number {
        const use = zone(id);
        return use.sqft - use.usedSqft;
    }

    // The extra shelves buying these materials needs: each material's
    // shelves after the purchase, less what it takes now.
    function shelvesNeeded(order: Order): number {
        return orderEntries(order).reduce((sum, [id, qty]) => {
            const material = window.materialsData.find((m) => m.id === id);
            if (!material || !(qty > 0)) return sum;
            return sum + materialShelves(material, material.inventory + qty) - materialShelves(material);
        }, 0);
    }

    function floorNeeded(order: Order): Partial<Record<ZoneId, number>> {
        const needed: Partial<Record<ZoneId, number>> = {};
        orderEntries(order).forEach(([id, qty]) => {
            const eq = window.equipmentData.find((e) => e.id === id);
            if (!eq || !(qty > 0)) return;
            const zoneId = eq.zone ?? 'lab';
            needed[zoneId] = (needed[zoneId] ?? 0) + qty * (eq.sqft ?? 0);
        });
        return needed;
    }

    return {
        ZONES,
        zoneLabel: (id) => ZONE_LABELS[id],
        zones: () => ZONES.map(zone),
        zone,
        materialShelves,
        productShelves,
        freeShelves,
        shelvesNeeded,
        freeSqft,
        floorNeeded,

        refuseMaterials(order) {
            const needed = shelvesNeeded(order);
            const free = freeShelves();
            if (needed <= 0 || needed <= free) return '';
            return (
                `Not enough storage: this order needs ${window.fmt.int(needed)} more shelves and ` +
                `${window.fmt.int(Math.max(0, free))} are free. Use up some stock first, or order less.`
            );
        },

        refuseEquipment(order) {
            const needed = floorNeeded(order);
            for (const zoneId of ZONES) {
                const sqft = needed[zoneId] ?? 0;
                if (sqft <= 0) continue;
                const free = freeSqft(zoneId);
                if (sqft > free) {
                    const label = ZONE_LABELS[zoneId].toLowerCase();
                    return current().zones[zoneId] > 0
                        ? `Not enough room in the ${label}: this needs ${window.fmt.int(sqft)} sq ft and ` +
                              `${window.fmt.int(Math.max(0, free))} sq ft are free. Buy fewer.`
                        : `This building has no ${label}.`;
                }
            }
            return '';
        },

        customerCapacity,
    };
})();
