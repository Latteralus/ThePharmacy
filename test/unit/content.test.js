/**
 * Tests for the game's content and setup (Phase 7): the research tree only
 * unlocks products and equipment that exist (H8), every product can be made
 * with equipment research unlocks no later than the product, location and
 * research change how the game plays (L6), and every game plays at Normal.
 */

function loadData() {
  jest.resetModules();
  window.gameState = { currentDate: new Date(2023, 0, 2, 9), dayIndex: 1, location: 'suburban' };
  require('../../build/main/js/data/materials.js');
  require('../../build/main/js/data/products.js');
  require('../../build/main/js/data/equipment.js');
  require('../../build/main/js/data/research.js');
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the research tree (H8)', () => {
  beforeEach(loadData);

  // The level that unlocks each product and each equipment item
  function levelOf(kind) {
    const levels = new Map();
    window.researchData.levels.forEach((level) =>
      level[kind].forEach((id) => {
        expect(levels.has(id)).toBe(false); // unlocked once
        levels.set(id, level.level);
      }),
    );
    return levels;
  }

  test('unlocks every product and equipment item there is, and nothing that does not exist', () => {
    const products = levelOf('unlockedProducts');
    const equipment = levelOf('unlockedEquipment');
    expect([...products.keys()].sort()).toEqual(window.productsData.map((p) => p.id).sort());
    expect([...equipment.keys()].sort()).toEqual(window.equipmentData.map((e) => e.id).sort());
  });

  test("every product's equipment is unlocked no later than the product", () => {
    const products = levelOf('unlockedProducts');
    const equipment = levelOf('unlockedEquipment');
    window.productsData.forEach((product) => {
      product.equipmentNeeded.forEach((id) => {
        expect(equipment.get(id)).toBeLessThanOrEqual(products.get(product.id));
      });
    });
  });

  test('every equipment item is needed by some product', () => {
    window.equipmentData.forEach((item) => {
      expect(window.productsData.some((p) => p.equipmentNeeded.includes(item.id))).toBe(true);
    });
  });

  test('every equipment item says where it goes in the building and the floor it takes (Phase 10)', () => {
    window.equipmentData.forEach((item) => {
      expect(item.zone).toBe('lab');
      expect(item.sqft).toBeGreaterThan(0);
      expect(item.sqft).toBeLessThanOrEqual(50);
    });
  });

  test('levels cost more and take longer as they go', () => {
    const levels = window.researchData.levels;
    expect(levels.map((l) => l.level)).toEqual([0, 1, 2, 3, 4]);
    for (let i = 2; i < levels.length; i++) {
      expect(levels[i].cost).toBeGreaterThan(levels[i - 1].cost);
      expect(levels[i].researchTime).toBeGreaterThan(levels[i - 1].researchTime);
    }
  });

  test('finishing a level tells the player what customers can now ask for', () => {
    window.updateUI = jest.fn();
    window.notifications = { add: jest.fn() };
    window.researchData.inProgress = { targetLevel: 1, startDayIndex: 0, daysRequired: 5 };
    window.research.checkResearchCompletion({ dayIndex: 5 });
    expect(window.researchData.currentLevel).toBe(1);
    expect(window.notifications.add).toHaveBeenCalledWith(expect.stringContaining('Amoxicillin Suspension'), 'success');
    delete window.notifications;
  });
});

describe('customers an hour (L6)', () => {
  beforeEach(() => {
    loadData();
    require('../../build/main/js/data/properties.js');
    require('../../build/main/js/company.js');
    require('../../build/main/js/brandReputation.js');
    window.brandReputation.reputationScore = 10;
  });

  test("follow the property's foot traffic and competitors, and the research level (Phase 10)", () => {
    const at = (listingId, level) => {
      const listing = window.properties.listings.find((l) => l.id === listingId);
      Object.assign(window.company.active(), { footTraffic: listing.footTraffic, competitors: listing.competitors });
      window.researchData.currentLevel = level;
      return window.brandReputation.calcCustomers(17); // 5 base after work
    };
    // Each area's default property brings what the area used to
    expect(at('maple-grove', 0)).toBe(5); // 5 x 1.1 x 1.01
    expect(at('market-street', 0)).toBe(7); // x 1.31
    expect(at('cedar-falls', 0)).toBe(4); // x 0.75
    expect(at('maple-grove', 2)).toBe(6); // x 1.2
    expect(at('market-street', 2)).toBe(8);
    // Competitors take a share: one more nearby, 6% fewer
    const one = window.properties.trafficFactor(1, 0);
    expect(window.properties.trafficFactor(1, 1)).toBeCloseTo(one * 0.94);
  });
});

describe('a new game', () => {
  function newGame(options) {
    jest.resetModules();
    window.gameState = { currentDate: new Date(2023, 0, 1, 7), dayIndex: 0 };
    window.updateUI = jest.fn();
    require('../../build/main/js/clock.js');
    require('../../build/main/js/ids.js');
    require('../../build/main/js/data/names.js');
    require('../../build/main/js/data/employees.js');
    require('../../build/main/js/data/materials.js');
    require('../../build/main/js/data/products.js');
    require('../../build/main/js/data/equipment.js');
    require('../../build/main/js/data/insurance.js');
    require('../../build/main/js/data/research.js');
    require('../../build/main/js/data/helpers.js');
    require('../../build/main/js/data/properties.js');
    require('../../build/main/js/data/lending.js');
    require('../../build/main/js/data/finances.js');
    require('../../build/main/js/saveFile.js');
    require('../../build/main/js/taskManager.js');
    require('../../build/main/js/taskAssignment.js');
    require('../../build/main/js/production.js');
    require('../../build/main/js/insuranceClaims.js');
    require('../../build/main/js/brandReputation.js');
    require('../../build/main/js/records.js');
    require('../../build/main/js/stakes.js');
    require('../../build/main/js/company.js');
    require('../../build/main/js/reports.js');
    require('../../build/main/js/gameInitializer.js');
    window.fmt = { money: (n) => `$${n.toFixed(2)}`, moneyWhole: (n) => `$${Math.round(n)}`, pct: (f) => `${f}` };
    expect(window.initializeNewGame(options)).toBe(true);
  }

  // What signing the lease costs: the deposit and the first month's rent
  const signing = (rent) => 2 * rent;

  test('plays at Normal, whatever it is asked for (there is no difficulty setting)', () => {
    newGame({ difficulty: 'expert' });
    expect(window.brandReputation.reputationScore).toBe(10);
    expect(window.gameState.difficulty).toBeUndefined();
  });

  test('every game starts with $100,000, and the property sets the rent and utilities (#1, #11)', () => {
    // The first listing, on a 3-year lease, when nothing is chosen: 2,000 sq ft at $27
    newGame({ startingCapital: 'low' });
    const suburban = window.company.active();
    expect(suburban.lease).toMatchObject({ listingId: 'maple-grove', termYears: 3, monthlyRent: 4500, deposit: 4500 });
    expect(window.financesData.cash).toBe(100000 - signing(4500));
    expect(window.company.dailyServices(suburban)).toBe(550); // $350 + $0.10 a sq ft
    // The lease ends three years on
    expect(new Date(suburban.lease.end).getFullYear()).toBe(2026);

    // A city storefront on a 1-year lease costs 10% more a month
    newGame({ startingCapital: 'high', propertyId: 'market-street', leaseYears: 1 });
    const urban = window.company.active();
    expect(urban.lease.monthlyRent).toBe(Math.round((1500 * 58 * 1.1) / 12));
    expect(window.financesData.cash).toBe(100000 - signing(urban.lease.monthlyRent));
    expect(window.company.dailyServices(urban)).toBe(Math.round(500 * 1.15));
    expect(urban.area).toBe('urban');
    expect(window.company.name).toBe('Your Pharmacy');
  });

  test('the deposit is held, not spent, and the first rent is a cost (#12)', () => {
    newGame({ pharmacyName: 'Mountain Care', propertyId: 'cedar-falls', leaseYears: 5 });
    expect(window.company.name).toBe('Mountain Care');
    const rent = window.company.active().lease.monthlyRent;
    expect(rent).toBe(Math.round((2200 * 14 * 0.93) / 12));
    const kinds = window.financesData.transactions.map((t) => [t.category, t.amount]);
    expect(kinds).toEqual(
      expect.arrayContaining([
        ['deposit', rent],
        ['rent', rent],
      ]),
    );
    // Only the rent is a cost
    expect(window.financesData.expenses.today).toBe(rent);
    expect(window.financesData.expenseCategories.rent).toBe(rent);
  });

  test('a startup loan comes in as cash, capped at what the bank lends for the property (#12)', () => {
    newGame({
      propertyId: 'maple-grove',
      loan: { amount: 900000, termYears: 12, guarantee: true, collateral: false },
    });
    const listing = window.properties.listings.find((l) => l.id === 'maple-grove');
    const cap = window.lending.maxAmount('retail', listing, 3);
    expect(cap).toBe(250000); // $150,000 + two years of rent, rounded down
    const [loan] = window.financesData.loans;
    expect(loan).toMatchObject({ name: 'Startup loan', principal: cap, balance: cap, termMonths: 120 });
    expect(loan.rate).toBeCloseTo(
      window.lending.quote({ amount: cap, termYears: 10, guarantee: true, collateral: false }).rate,
    );
    expect(window.financesData.cash).toBe(100000 + cap - signing(4500));
    // Principal is financing: neither revenue nor a cost
    expect(window.financesData.revenue.today).toBe(0);
    expect(window.stakes.debt()).toBe(cap);
  });

  test("a new game's restocks cover only what it can make", () => {
    newGame({});
    const restocked = [...new Set(window.taskManager.tasks.map((t) => t.productId))].sort();
    // Level 0's tablets; its capsules need a Capsule Filler first
    expect(restocked).toEqual(['pd001', 'pd004', 'pd006', 'pd007', 'pd008', 'pd009', 'pd010']);
  });

  test('a new game starts paused, with no staff', () => {
    newGame({});
    expect(window.gameState.isPaused).toBe(true);
    expect(window.employeesData).toEqual([]);
  });
});
