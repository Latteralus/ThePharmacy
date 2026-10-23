// insurance.js

// Formularies reference main/js/data/products.ts's Product.id values
// (pd001-pd025, the only ids that data file actually defines). Breadth
// varies loosely by copay tier: cheaper copay plans cover more.
//
// A plan pays a contract price, not the pharmacy's: reimbursementRate times
// the market price (finances.marketPrice), of which the customer pays the
// copay share. Real plans pay a pharmacy little more than the drug's cost,
// which is why its margins are thin. The player's prices reach only
// self-pay customers and drugs that aren't on the customer's formulary.
function formularyRange(count: number): string[] {
    const ids: string[] = [];
    for (let i = 1; i <= count; i++) {
        ids.push(`pd${String(i).padStart(3, '0')}`);
    }
    return ids;
}

window.insuranceData = [
    {
        planName: 'MediQuick',
        copayType: 'percentage',
        copayPercentage: 20, // 20% copay
        reimbursementRate: 0.95,
        formulary: formularyRange(20), // broad coverage, low copay
    },
    {
        planName: 'HealthFirst',
        copayType: 'percentage',
        copayPercentage: 30, // 30% copay
        reimbursementRate: 1, // the best payer: the market price
        formulary: formularyRange(15),
    },
    {
        planName: 'CarePlus',
        copayType: 'percentage',
        copayPercentage: 25, // 25% copay
        reimbursementRate: 0.97,
        formulary: formularyRange(18),
    },
    {
        planName: 'UnitedCare',
        copayType: 'percentage',
        copayPercentage: 15, // 15% copay
        reimbursementRate: 0.9, // its low copay comes out of the pharmacy's margin
        formulary: formularyRange(22), // cheapest copay, broadest coverage
    },
    {
        planName: 'StateHealth',
        copayType: 'percentage',
        copayPercentage: 40, // 40% copay
        reimbursementRate: 0.85, // pays least, close to the drug's cost
        formulary: formularyRange(10), // priciest copay, narrowest coverage
    },
    {
        planName: 'Uninsured',
        copayType: 'percentage',
        copayPercentage: 100, // 100% copay (full price)
        reimbursementRate: null, // self-pay: the pharmacy's own price
        formulary: null, // moot - self-pay is already 100% regardless of formulary
    },
];
