/**
 * Property-based tests (fast-check) for the production math in
 * main/js/data/helpers.js: whatever the material inventory, the reported
 * potential production must be exactly the most units the inventory covers.
 */

const fc = require('fast-check');

describe('helpers production math (property-based)', () => {
  beforeEach(() => {
    jest.resetModules();
    require('../../main/js/data/materials.js');
    require('../../main/js/data/products.js');
    require('../../main/js/data/helpers.js');
  });

  function fitsInventory(needed) {
    return Object.entries(needed).every(([id, qty]) => qty <= window.materialsData.find((m) => m.id === id).inventory);
  }

  test('potential production is the largest quantity the inventory covers', () => {
    const productIds = window.productsData.map((p) => p.id);

    fc.assert(
      fc.property(
        fc.constantFrom(...productIds),
        fc.array(fc.nat({ max: 5000 }), {
          minLength: window.materialsData.length,
          maxLength: window.materialsData.length,
        }),
        (productId, inventories) => {
          window.materialsData.forEach((m, i) => {
            m.inventory = inventories[i];
          });

          const n = window.helpers.calculatePotentialProduction(productId);

          expect(Number.isInteger(n)).toBe(true);
          expect(n).toBeGreaterThanOrEqual(0);
          expect(fitsInventory(window.helpers.calculateMaterialsNeeded(productId, n))).toBe(true);
          expect(fitsInventory(window.helpers.calculateMaterialsNeeded(productId, n + 1))).toBe(false);
        },
      ),
    );
  });
});
