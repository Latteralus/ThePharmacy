/**
 * Unit tests for the plain-script game data/logic modules under main/js.
 * These files aren't CommonJS modules - they assign directly onto `window`
 * (loaded as <script> tags in the real app) - so we load them with require()
 * inside a jsdom environment and assert on the resulting globals.
 */

describe('game data & finance logic', () => {
  beforeEach(() => {
    jest.resetModules();
    require('../../main/js/data/materials.js');
    require('../../main/js/data/products.js');
    require('../../main/js/ui.js');
    require('../../main/js/data/finances.js');
    require('../../main/js/data/helpers.js');
  });

  test('materials.js populates window.materialsData with valid entries', () => {
    expect(Array.isArray(window.materialsData)).toBe(true);
    expect(window.materialsData.length).toBeGreaterThan(0);

    const material = window.materialsData.find((m) => m.id === 'mat001');
    expect(material).toBeDefined();
    expect(material.cost).toBeGreaterThan(0);
  });

  test('products.js populates window.productsData with valid entries', () => {
    expect(Array.isArray(window.productsData)).toBe(true);

    const product = window.productsData.find((p) => p.id === 'pd001');
    expect(product).toBeDefined();
    expect(product.ingredients.length).toBeGreaterThan(0);
  });

  test('window.calculateProductCost sums ingredient costs from materialsData', () => {
    const cost = window.calculateProductCost('pd001');
    expect(cost).toBeGreaterThan(0);
  });

  // M6: products.js and materials.js each defined calculateMaterialCost,
  // and whichever loaded last won.
  test('buying materials gets the bulk discount; a product cost is at list price', () => {
    const mat001 = window.materialsData.find((m) => m.id === 'mat001');
    expect(window.calculateMaterialCost('mat001', 10)).toBeCloseTo(mat001.cost * 10);
    expect(window.calculateMaterialCost('mat001', 100)).toBeCloseTo(mat001.cost * 100 * 0.9);
    expect(window.helpers.calculateOrderCost({ mat001: 100 })).toBeCloseTo(mat001.cost * 100 * 0.9);

    const pd001 = window.productsData.find((p) => p.id === 'pd001');
    const listCost = pd001.ingredients.reduce(
      (sum, ing) => sum + window.materialsData.find((m) => m.id === ing.id).cost * ing.quantity,
      0,
    );
    expect(window.calculateProductCost('pd001')).toBeCloseTo(listCost);
  });

  // Regression test for the 2026-08-14 startup crash: gameInitializer.js
  // called the bare global window.updateUI(page), but only window.ui.updateUI
  // ever existed, so every new game crashed during setToSuggestedPrices().
  test('window.updateUI exists as an alias for window.ui.updateUI', () => {
    expect(typeof window.updateUI).toBe('function');
    expect(() => window.updateUI('inventory')).not.toThrow();
  });

  test('finances.setToSuggestedPrices sets product prices without throwing', () => {
    expect(() => window.finances.setToSuggestedPrices()).not.toThrow();

    const product = window.productsData.find((p) => p.id === 'pd001');
    expect(product.price).toBeGreaterThan(0);
  });
});
