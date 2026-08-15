// Ambient typings for the window-global surface shared between converted
// .ts files and the plain .js files not yet converted. Grows by one small
// interface per file as the migration proceeds — see docs/revision.md.

interface InsurancePlan {
  planName: string;
  copayType: "percentage";
  copayPercentage: number;
  formulary: string[] | null;
}

interface BulkDiscount {
  minQuantity: number;
  discount: number;
}

interface Material {
  id: string;
  name: string;
  cost: number;
  inventory: number;
  autoOrderThreshold: number;
  autoOrderAmount: number;
  leadTime: number;
  supplier: string;
  bulkDiscounts: BulkDiscount[];
}

interface NamesData {
  firstNames: string[];
  lastNames: string[];
}

interface Window {
  insuranceData: InsurancePlan[];
  materialsData: Material[];
  calculateMaterialCost: (materialId: string, quantity: number) => number;
  namesData: NamesData;
  getRandomFirstName: () => string;
  getRandomLastName: () => string;
  generateDoctorName: () => string;
}
