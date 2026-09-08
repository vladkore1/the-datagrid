import { expect, test, type Page } from "@playwright/test";

/*
 * The mobile tree: what the layout owes a tree grid that the table does not.
 * Driven through /examples/hierarchy-scale, which is the only page carrying a
 * branch wide enough to be capped and a tree deep enough to bury a match.
 */

const SCALE_PAGE = "/examples/hierarchy-scale";

async function openScalePage(page: Page, width: number, height = 950) {
  await page.setViewportSize({ width, height });
  await page.goto(SCALE_PAGE);
  await page
    .getByTestId("hierarchy-scale-grid")
    .locator(".tdg-root")
    .first()
    .waitFor();
}

const treeGrid = (page: Page) => page.getByTestId("hierarchy-scale-grid");

const rowNames = (page: Page) =>
  treeGrid(page)
    .locator(".tdg-mobile-row [data-cell-role='primary']")
    .evaluateAll((cells) => cells.map((cell) => cell.textContent?.trim()));

test("refuses the card variant on a tree and hides the variant toggle", async ({
  page,
}) => {
  await openScalePage(page, 390);

  const list = treeGrid(page).locator('[data-slot="mobile-grid-list"]');
  // A card draws its own box, and a box cannot carry indentation.
  await expect(list).toHaveAttribute("data-variant", "list");
  await expect(treeGrid(page).locator(".tdg-mobile-card")).toHaveCount(0);
  await expect(
    treeGrid(page).locator(".tdg-mobile-variant-toggle")
  ).toHaveCount(0);
});

test("indents a node by its depth and squares the toggle", async ({ page }) => {
  await openScalePage(page, 390);

  await treeGrid(page)
    .getByRole("button", { name: "Expand node 1000", exact: true })
    .click();
  await expect(
    treeGrid(page).locator('.tdg-mobile-row[data-row-id="1000/1001"]')
  ).toBeVisible();

  const indents = await treeGrid(page)
    .locator(".tdg-mobile-row")
    .evaluateAll((rows) =>
      rows.slice(0, 3).map((row) => {
        const holder = row.querySelector<HTMLElement>(
          "span.inline-flex.shrink-0.items-center"
        );
        return holder
          ? getComputedStyle(holder).paddingInlineStart
          : "(no toggle)";
      })
    );
  expect(indents[0]).toBe("0px");
  expect(indents[1]).toBe("16px");

  const toggle = await treeGrid(page)
    .locator('[data-slot="tree-toggle"]')
    .first()
    .evaluate((button) => {
      const box = button.getBoundingClientRect();
      return { width: Math.round(box.width), height: Math.round(box.height) };
    });
  expect(toggle.width).toBe(toggle.height);
});

test("caps a branch and reveals the rest without displacing later roots", async ({
  page,
}) => {
  await openScalePage(page, 390);

  const rootsBefore = await rowNames(page);
  expect(rootsBefore).toContain("Torneby KG");

  await treeGrid(page)
    .getByRole("button", { name: "Expand node 1000", exact: true })
    .click();
  await expect(
    treeGrid(page).locator('.tdg-mobile-row[data-row-id="1000/1001"]')
  ).toBeVisible();

  /*
   * The branch holds thousands of children. What matters is that the later
   * roots are still reachable, which a budget over the flat run would not
   * manage: the first expansion would have spent it.
   */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(async () => (await rowNames(page)).includes("Torneby KG"))
    .toBe(true);
});

test("finds a match inside a collapsed branch and reveals its ancestors", async ({
  page,
}) => {
  await openScalePage(page, 390);

  const search = treeGrid(page)
    .getByPlaceholder(/Search all fields/i)
    .first();

  /*
   * `Standort 101-3` is two levels down under a branch that starts closed. The
   * layout used to search only the rows the tree had already flattened, so this
   * returned nothing at all.
   */
  await search.fill("Standort 101-3");
  await expect
    .poll(async () => await rowNames(page))
    .toEqual(expect.arrayContaining(["Standort 101-3"]));

  const revealed = await rowNames(page);
  // The ancestors come with it, so the match can be read in context.
  expect(revealed).toContain("Quellrand Group");
  expect(revealed.indexOf("Quellrand Group")).toBeLessThan(
    revealed.indexOf("Standort 101-3")
  );

  await search.fill("");
  await expect.poll(async () => (await rowNames(page)).length).toBe(4);
});

test("opens a row's fields on tap while the chevron keeps the branch", async ({
  page,
}) => {
  await openScalePage(page, 390);

  const row = treeGrid(page)
    .locator('.tdg-mobile-row[data-row-id="1000"]')
    .first();
  const fields = row.locator('[data-slot="mobile-row-fields"]');
  await expect(fields).toHaveCount(0);

  await row.locator('[data-cell-role="primary"]').click();
  await expect(fields).toHaveCount(1);
  // The branch is the chevron's business, so the tap left it alone.
  await expect(
    treeGrid(page).locator('.tdg-mobile-row[data-row-id="1000/1001"]')
  ).toHaveCount(0);

  await row
    .getByRole("button", { name: "Expand node 1000", exact: true })
    .click();
  await expect(
    treeGrid(page).locator('.tdg-mobile-row[data-row-id="1000/1001"]')
  ).toBeVisible();
  // Both open at once: a parent's own details are not the same as its children.
  await expect(fields).toHaveCount(1);
});

test("paints an open row from its indent and leaves the gutter to its own token", async ({
  page,
}) => {
  await openScalePage(page, 390);

  await treeGrid(page)
    .getByRole("button", { name: "Expand node 1000", exact: true })
    .click();
  const child = treeGrid(page)
    .locator('.tdg-mobile-row[data-row-id="1000/1001"]')
    .first();
  await child.locator('[data-cell-role="primary"]').click();
  await expect(child).toHaveAttribute("data-expanded", "true");

  const painted = await child.evaluate((row) => {
    const style = getComputedStyle(row);
    return {
      inset: style.getPropertyValue("--tdg-mobile-row-indent-inset").trim(),
      gradient: style.backgroundImage !== "none",
    };
  });
  // One level in, so the fill starts after the indent rather than at the edge.
  expect(painted.inset).toContain("16px");
  expect(painted.gradient).toBe(true);
});

test("caps a branch on the table too, once the prop asks for it", async ({
  page,
}) => {
  await openScalePage(page, 1440, 900);

  const grid = treeGrid(page);
  await expect(grid.locator(".tdg-root").first()).toHaveAttribute(
    "data-layout",
    "table"
  );

  await grid
    .getByRole("button", { name: "Expand node 1000", exact: true })
    .click();

  const control = grid.locator('[data-slot="tree-branch-more-button"]').first();
  await expect(control).toBeVisible();
  const label = (await control.innerText()).replace(/\s+/g, " ");
  // The count is what is left in the branch, not what one press reveals.
  expect(label).toMatch(/Show more \(\d{3,}\)/);

  const rowsBefore = await grid.locator('[data-slot="grid-row"]').count();
  await control.click();
  await expect
    .poll(async () => await grid.locator('[data-slot="grid-row"]').count())
    .toBeGreaterThan(rowsBefore);
});
