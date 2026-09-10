import { expect, test, type Page } from "@playwright/test";

async function documentGeometry(page: Page) {
  return page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    windowScrollY: window.scrollY,
  }));
}

test.describe("documentation shell UI", () => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
    { width: 320, height: 568 },
  ]) {
    test(`contains scrolling at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/docs/reference/reactdatagrid");

      const content = page.getByTestId("docs-content");
      await expect(content).toBeVisible();
      await expect
        .poll(() =>
          content.evaluate(
            (element) => element.scrollHeight > element.clientHeight
          )
        )
        .toBe(true);

      const before = await documentGeometry(page);
      expect(before.scrollWidth).toBeLessThanOrEqual(before.clientWidth);
      expect(before.clientWidth).toBeLessThanOrEqual(before.viewportWidth);
      expect(
        await page.evaluate(() => ({
          body: getComputedStyle(document.body).overflow,
          root: getComputedStyle(document.documentElement).overflow,
        }))
      ).toEqual({ body: "hidden", root: "hidden" });

      await page.evaluate(() => window.scrollTo({ top: 500 }));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

      await content.hover();
      await page.mouse.wheel(0, 500);
      await expect
        .poll(() => content.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);

      if (viewport.width === 320) {
        await page.goto("/examples/basic");
        expect(
          await page.evaluate(() => ({
            body: getComputedStyle(document.body).overflow,
            root: getComputedStyle(document.documentElement).overflow,
          }))
        ).toEqual({ body: "visible", root: "visible" });
      }
    });
  }

  test("keeps short-screen mobile navigation reachable", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/docs/getting-started/quickstart");

    const trigger = page.getByRole("button", {
      name: "Open navigation menu",
    });
    await trigger.click();

    const navigation = page.getByRole("navigation", {
      name: "Mobile navigation",
    });
    await expect(navigation).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "GitHub", exact: true })
    ).toBeInViewport();

    await page.keyboard.press("Escape");
    await expect(navigation).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("uses one accessible copy control per code block", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "__lastCopiedText", {
        configurable: true,
        writable: true,
        value: "",
      });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as { __lastCopiedText: string }).__lastCopiedText = text;
          },
        },
      });
    });
    await page.goto("/docs/getting-started/quickstart");

    const block = page.getByTestId("copy-code-block-tsx");
    const copyButton = block.getByRole("button", {
      name: "Copy tsx code button",
    });

    await expect(block).not.toHaveAttribute("role", "button");
    await expect(block).not.toHaveAttribute("tabindex", "0");
    await expect(copyButton).toHaveCount(1);
    expect(
      await copyButton.evaluate((element) =>
        Boolean(element.parentElement?.closest('[role="button"]'))
      )
    ).toBe(false);

    await copyButton.focus();
    await copyButton.press("Enter");
    await expect(copyButton.getByText("Copied")).toBeAttached();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as { __lastCopiedText: string }).__lastCopiedText
        )
      )
      .not.toBe("");
  });

  test("keeps long-form prose at a readable measure", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/docs/getting-started/styling");

    const paragraph = page.locator("#packaged-css").locator("p").first();
    await expect(paragraph).toBeVisible();
    await expect
      .poll(() =>
        paragraph.evaluate((element) => element.getBoundingClientRect().width)
      )
      .toBeLessThanOrEqual(768);
  });
});

test.describe("grid interaction UI", () => {
  test("keeps a drilled-in column menu scrollable to its last entry", async ({
    page,
  }) => {
    // Short enough that the column list plus its Back entry outgrows the room
    // the menu is given, which is the only state that exercises this.
    await page.setViewportSize({ width: 1280, height: 620 });
    await page.goto("/examples/columns");

    await page
      .getByRole("button", { name: "Column menu", exact: true })
      .first()
      .click();
    const menu = page.getByRole("menu", { name: "Column menu" });
    await menu.getByRole("menuitem", { name: "Columns", exact: true }).click();

    const back = menu.getByRole("menuitem", { name: "Back" });
    await expect(back).toBeVisible();

    const box = await menu.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: getComputedStyle(element).overflowY,
      bottom: element.getBoundingClientRect().bottom,
    }));

    // The menu never outgrows the room reported for it, and what does not fit
    // is reachable rather than clipped away.
    expect(box.bottom).toBeLessThanOrEqual(620 + 1);
    expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);
    expect(box.overflowY).toBe("auto");

    await back.scrollIntoViewIfNeeded();
    const [menuBox, backBox] = await Promise.all([
      menu.boundingBox(),
      back.boundingBox(),
    ]);
    expect(backBox!.y).toBeGreaterThanOrEqual(menuBox!.y - 1);
    expect(backBox!.y + backBox!.height).toBeLessThanOrEqual(
      menuBox!.y + menuBox!.height + 1
    );
  });

  test("restores a visible focus ring after closing a column menu", async ({
    page,
  }) => {
    await page.goto("/examples/columns");
    await page.addStyleTag({
      content: "button { box-shadow: none !important; }",
    });

    const trigger = page
      .getByRole("button", { name: "Column menu", exact: true })
      .first();
    await trigger.press("Enter");
    const firstItem = page
      .getByRole("menu", { name: "Column menu" })
      .getByRole("menuitem")
      .first();
    await expect(firstItem).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(firstItem).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveCSS("outline-style", "none");
    expect(
      await trigger.evaluate((element) => element.matches(":focus-visible"))
    ).toBe(true);
    await expect
      .poll(() =>
        trigger.evaluate((element) => getComputedStyle(element).boxShadow)
      )
      .toContain("inset");

    const resizeHandle = page.locator('[data-slot="column-resizer"]').first();
    const resizeHandleBox = await resizeHandle.boundingBox();
    expect(resizeHandleBox?.width).toBeGreaterThanOrEqual(24);
  });

  test("closes mobile settings with Escape and restores focus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/examples/mobile-transform");

    // The sort, search-scope and column controls are gathered behind this one
    // trigger, so it is the thing Escape has to return focus to.
    const trigger = page.getByRole("button", { name: "Settings" });
    const panel = page.locator(".tdg-mobile-settings-drawer");

    await trigger.click();
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();

    const sortBy = page.getByRole("combobox", {
      name: "Sort by",
      exact: true,
    });
    await trigger.click();
    await expect(panel).toBeVisible();
    await sortBy.focus();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();

    // A listbox inside the drawer takes the first Escape, the drawer the next.
    await trigger.click();
    await sortBy.click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(listbox).toHaveCount(0);
    await expect(panel).toBeVisible();
    await expect(sortBy).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();

    const geometry = await documentGeometry(page);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  });

  test("keeps the narrow mobile toolbar and settings panel in bounds", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/examples/mobile-transform");

    const grid = page.locator('[data-slot="mobile-grid-list"]');
    const search = page.getByRole("search", { name: "Search all fields" });
    const settings = page.getByRole("button", { name: "Settings" });
    const gridBox = await grid.boundingBox();
    expect(gridBox).not.toBeNull();

    for (const control of [search, settings]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(gridBox!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(
        gridBox!.x + gridBox!.width
      );
      expect(box!.height).toBeGreaterThanOrEqual(36);
    }

    await settings.click();
    const drawer = page.locator(".tdg-mobile-settings-drawer");
    await expect(drawer).toBeVisible();
    /*
     * The drawer is a sheet over the page rather than a panel inside the grid,
     * so the viewport is what has to contain it, and it slides in: its trailing
     * edge only means anything once the animation has settled.
     */
    await expect
      .poll(async () => {
        const box = await drawer.boundingBox();
        return Math.round((box?.x ?? 0) + (box?.width ?? 0));
      })
      .toBeLessThanOrEqual(320);
    const panelBox = await drawer.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.x).toBeGreaterThanOrEqual(0);

    const geometry = await documentGeometry(page);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  });
});
