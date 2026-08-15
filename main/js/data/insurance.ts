// insurance.js

// Formularies reference main/js/data/products.ts's Product.id values
// (pd001-pd025, the only ids that data file actually defines). Breadth
// varies loosely by copay tier: cheaper copay plans cover more.
function formularyRange(count: number): string[] {
    const ids: string[] = [];
    for (let i = 1; i <= count; i++) {
        ids.push(`pd${String(i).padStart(3, '0')}`);
    }
    return ids;
}

window.insuranceData = [
    {
        planName: "MediQuick",
        copayType: "percentage",
        copayPercentage: 20, // 20% copay
        formulary: formularyRange(20) // broad coverage, low copay
    },
    {
        planName: "HealthFirst",
        copayType: "percentage",
        copayPercentage: 30, // 30% copay
        formulary: formularyRange(15)
    },
    {
        planName: "CarePlus",
        copayType: "percentage",
        copayPercentage: 25, // 25% copay
        formulary: formularyRange(18)
    },
    {
        planName: "UnitedCare",
        copayType: "percentage",
        copayPercentage: 15, // 15% copay
        formulary: formularyRange(22) // cheapest copay, broadest coverage
    },
    {
        planName: "StateHealth",
        copayType: "percentage",
        copayPercentage: 40, // 40% copay
        formulary: formularyRange(10) // priciest copay, narrowest coverage
    },
    {
        planName: "Uninsured",
        copayType: "percentage",
        copayPercentage: 100, // 100% copay (full price)
        formulary: null // moot - self-pay is already 100% regardless of formulary
    }
];
