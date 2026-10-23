/**
 * Tests for the game's content and setup (Phase 7): the research tree only
 * unlocks products and equipment that exist (H8), every product can be made
 * with equipment research unlocks no later than the product, location and
 * research change how the game plays (L6), and every game plays at Normal.
 */

function loadData() {
  jest.resetModules();
  window.gameState = { currentDate: new Date(2023, 0, 2, 9), dayIndex: 1, location: 'suburban' };
  require('../../main/js/data/materials.js');
  require('../../main/js/data/products.js');
  require('../../main/js/data/equipment.js');
  require('../../main/js/data/research.js');
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
    require('../../main/js/brandReputation.js');
    window.brandReputation.reputationScore = 10;
  });

  test('follow the location and the research level', () => {
    const at = (location, level) => {
      window.gameState.location = location;
      window.researchData.currentLevel = level;
      return window.brandReputation.calcCustomers(17); // 5 base after work
    };
    expect(at('suburban', 0)).toBe(5); // 5 x 1.1
    expect(at('urban', 0)).toBe(7); // x 1.3
    expect(at('rural', 0)).toBe(4); // x 0.75
    expect(at('suburban', 2)).toBe(6); // x 1.2
    expect(at('urban', 2)).toBe(8);
  });
});

describe('a new game', () => {
  function newGame(options) {
    jest.resetModules();
    window.gameState = { currentDate: new Date(2023, 0, 1, 7), dayIndex: 0 };
    window.updateUI = jest.fn();
    require('../../main/js/clock.js');
    require('../../main/js/ids.js');
    require('../../main/js/data/names.js');
    require('../../main/js/data/employees.js');
    require('../../main/js/data/materials.js');
    require('../../main/js/data/products.js');
    require('../../main/js/data/equipment.js');
    require('../../main/js/data/insurance.js');
    require('../../main/js/data/research.js');
    require('../../main/js/data/helpers.js');
    require('../../main/js/data/finances.js');
    require('../../main/js/taskManager.js');
    require('../../main/js/taskAssignment.js');
    require('../../main/js/production.js');
    require('../../main/js/insuranceClaims.js');
    require('../../main/js/brandReputation.js');
    require('../../main/js/gameInitializer.js');
    expect(window.initializeNewGame(options)).toBe(true);
  }

  test('plays at Normal, whatever it is asked for (there is no difficulty setting)', () => {
    newGame({ difficulty: 'expert', startingCapital: 'medium', location: 'suburban' });
    expect(window.financesData.cash).toBe(100000);
    expect(window.financesData.overhead).toBe(700); // the $700 base (balance pass)
    expect(window.brandReputation.reputationScore).toBe(10);
    expect(window.gameState.difficulty).toBeUndefined();
  });

  test('starting capital sets the cash, and location the rent', () => {
    newGame({ startingCapital: 'low', location: 'urban' });
    expect(window.financesData.cash).toBe(50000);
    expect(window.financesData.overhead).toBe(910);

    newGame({ startingCapital: 'high', location: 'rural' });
    expect(window.financesData.cash).toBe(200000);
    expect(window.financesData.overhead).toBe(490);
  });

  test("a new game's restocks cover only what it can make", () => {
    newGame({ startingCapital: 'medium', location: 'suburban' });
    const restocked = [...new Set(window.taskManager.tasks.map((t) => t.productId))].sort();
    // Level 0's tablets; its capsules need a Capsule Filler first
    expect(restocked).toEqual(['pd001', 'pd004', 'pd006', 'pd007', 'pd008', 'pd009', 'pd010']);
  });

  test('a new game starts paused, with no staff', () => {
    newGame({ startingCapital: 'medium', location: 'suburban' });
    expect(window.gameState.isPaused).toBe(true);
    expect(window.employeesData).toEqual([]);
  });
});
