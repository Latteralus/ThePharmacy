// Customers and their prescriptions (customers.ts, prescriptions.ts).
//
// Ambient typings for the window globals: every file is a classic
// <script> (no modules), and each module adds its own fields to Window.

interface CustomerTypeDef {
    patience: number;
    baseBoost: number;
}

// A customer's visit, in order. customers.advance moves between them; see
// CUSTOMER_TRANSITIONS in customers.ts. The prescription's fill runs
// alongside check-in and consultation, so "filled" can arrive in any of the
// first three states, but only waitingForFill moves on because of it.
type CustomerStatus =
    'waitingForCheckIn' | 'waitingForConsultation' | 'waitingForFill' | 'readyForCheckout' | 'completed';

// What finishing a customer's task means for them.
type CustomerEvent = 'checkedIn' | 'consulted' | 'filled' | 'paid';

// Why a customer left, which decides the reputation change.
//   served: paid and left (mood-based)
//   impatient: ran out of patience
//   closing: still in the store at 22:00
//   price: refused the price at check-in
//   unavailable: turned away at the door; the pharmacy couldn't supply
//     their prescription (no stock, and no working equipment to make it),
//     or the front store was full (Phase 10)
//   reset: had no prescription after a load (reconcileTasks; no change)
type DepartureReason = 'served' | 'impatient' | 'closing' | 'price' | 'unavailable' | 'reset';

interface Customer {
    id: string;
    type: string;
    status: CustomerStatus;
    arrivedAt: number;
    insurance: InsurancePlan;
    prescriptionId: string | null;
    // In game minutes. Drained by customers.updatePatience once per game minute.
    patience: number;
    firstName: string;
    lastName: string;
    mood: number;
    // Game time (ms), from clock.now().
    lastStateChange: number;
    // True when this customer was generated from an eligible RefillRecord
    // rather than as a brand-new walk-in.
    isReturning?: boolean;
}

interface CustomersApi {
    activeCustomers: Customer[];
    customerTypes: Record<string, CustomerTypeDef>;
    // hour is accepted but never actually read by the implementation
    // (customers.ts) — timeEvents.ts's spawnCustomersForHour calls this with
    // no argument at all, which has always worked for that reason. Optional
    // here to match, not a behavior change.
    // null when no prescription could be written (the customer doesn't
    // come in), or when it can't be supplied (they're turned away, which
    // counts as an 'unavailable' departure).
    generateCustomer: (hour?: number) => Customer | null;
    // Applies an event if the customer's current status allows it (logs and
    // returns false otherwise). The only thing that changes Customer.status.
    advance: (customerId: string, event: CustomerEvent) => boolean;
    updateCustomerMood: (customerId: string, moodChange: number) => void;
    extendPatience: (customerId: string, minutesToAdd: number) => void;
    adjustPatienceDecayRate: (customer: Customer) => number;
    customerLeaves: (customerId: string, reason: DepartureReason) => void;
    updatePatience: () => void;
    sendRemainingCustomersHome: () => void;
    updateReputationOnDeparture: (customer: Customer, reason: DepartureReason) => void;
    getRandomCustomerType: () => string;
    getRandomInsurance: () => InsurancePlan;
    getInsuranceByPlanName: (planName: string) => InsurancePlan;
    getCustomerById: (customerId: string) => Customer | undefined;
    // Creates any task a customer's status or prescription needs but lacks
    // (after a load, or a bug). Returns how many it repaired.
    reconcileTasks: () => number;
}

// pending until its fill task finishes, filled until the customer pays.
type PrescriptionStatus = 'pending' | 'filled' | 'completed';

interface Prescription {
    id: string;
    customerId: string;
    productId: string;
    productName: string;
    dosage: number;
    dosageForm: string;
    frequency: string;
    status: PrescriptionStatus;
    doctorName: string;
    refillsAllowed: number;
    assignedEmployeeId: string | null;
    createdAt: number;
    // True when this prescription was generated from a RefillRecord rather
    // than freshly picked at random (see PrescriptionsApi.generateRefillPrescription).
    isRefill?: boolean;
    // What the customer agreed to pay (all units) at check-in (finances.quotePrice).
    quotedPrice?: number;
}

// A pending refill opportunity, registered when a prescription with
// refillsAllowed > 0 is filled. Lets a customer "return" later for another
// fill of the same product without the game tracking full customer
// identity/history beyond what's snapshotted here.
interface RefillRecord {
    id: string;
    customerFirstName: string;
    customerLastName: string;
    insurancePlanName: string;
    productId: string;
    productName: string;
    dosage: number;
    dosageForm: string;
    frequency: string;
    doctorName: string;
    refillsAvailable: number;
    eligibleAfterTime: number;
    sourcePrescriptionId: string;
}

interface PrescriptionsApi {
    activePrescriptions: Prescription[];
    refillRegistry: RefillRecord[];
    // Write a prescription (no tasks yet: customers.generateCustomer checks
    // canSupply, then calls ensureFill). null if none could be written.
    generatePrescription: (customerId: string) => string | null;
    generateRefillPrescription: (customerId: string, record: RefillRecord) => string | null;
    // Stock covers the dosage, or the equipment to make it is owned and working.
    canSupply: (prescription: Prescription) => boolean;
    // Makes sure a pending prescription has a fill task that either holds
    // its stock or waits on a compound task. Returns true if it had to
    // create or repair anything.
    ensureFill: (prescription: Prescription) => boolean;
    // Gives a fill task its stock if there's enough, otherwise puts it
    // behind a compound task that makes it.
    supplyFill: (fill: Task) => void;
    updatePrescriptionStatus: (prescriptionId: string, newStatus: PrescriptionStatus) => void;
    prescriptionFilled: (prescriptionId: string, customerId: string) => void;
    createConsultationTask: (customerId: string) => void;
    getPrescription: (prescriptionId: string) => Prescription | undefined;
    getRandomFrequency: () => string;
    removePrescriptionsByCustomer: (customerId: string) => void;
    getEligibleRefillRecord: (currentTime: number) => RefillRecord | undefined;
    consumeRefillRecord: (recordId: string) => RefillRecord | undefined;
    // New stock of productId: waiting fills whose compound hasn't started take it.
    useStockForWaitingFills: (productId: string) => void;
}

interface Window {
    prescriptions: PrescriptionsApi;
    customers: CustomersApi;
}
