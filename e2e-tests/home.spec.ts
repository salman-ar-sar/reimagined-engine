import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Tailspin Toys - Crowdfunding your new favorite game!');
  });

  test('should display the main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome to Tailspin Toys', exact: true })).toBeVisible();
  });

  test('should display the site branding in header', async ({ page }) => {
    await expect(page.getByText('Tailspin Toys').first()).toBeVisible();
  });

  test('should display the welcome message', async ({ page }) => {
    await expect(page.getByText('Find your next game! And maybe even back one! Explore our collection!')).toBeVisible();
  });

  test('should let users sort games by title in reverse order', async ({ page }) => {
    const sortControl = page.getByLabel('Sort games');
    await sortControl.selectOption('title-desc');

    const titles = await page.locator('[data-testid="game-card"] [data-testid="game-title"]').allTextContents();
    const expected = [...titles].sort((left, right) => right.localeCompare(left, undefined, { sensitivity: 'base' }));

    expect(titles).toEqual(expected);
  });

  test('should let users sort games by star rating with unrated games last', async ({ page }) => {
    const sortControl = page.getByLabel('Sort games');
    await sortControl.selectOption('rating-desc');

    const cards = page.locator('[data-testid="game-card"]');
    const ordered = await cards.evaluateAll((elements) =>
      elements.map((element) => ({
        title: element.getAttribute('data-game-title') ?? '',
        rating: element.getAttribute('data-game-rating') ?? '',
      })),
    );

    const expected = [...ordered].sort((left, right) => {
      const leftRating = left.rating === '' ? Number.NEGATIVE_INFINITY : Number(left.rating);
      const rightRating = right.rating === '' ? Number.NEGATIVE_INFINITY : Number(right.rating);

      if (leftRating === rightRating) {
        return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
      }

      if (leftRating === Number.NEGATIVE_INFINITY) {
        return 1;
      }

      if (rightRating === Number.NEGATIVE_INFINITY) {
        return -1;
      }

      return rightRating - leftRating;
    });

    expect(ordered).toEqual(expected);
  });
});
