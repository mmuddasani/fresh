import { assertEquals } from "$std/testing/asserts.ts";
import { waitForText, withPageName } from "./test_utils.ts";

Deno.test({
  name: "injects server content with no islands present",
  async fn() {
    await withPageName(
      "./tests/fixture_partials/main.ts",
      async (page, address) => {
        await page.goto(`${address}/no_islands`);
        await page.waitForSelector("#output");

        const href = await page.$eval("a[fh-partial]", (el) => el.href);
        await page.click("a[fh-partial]");
        await waitForText(page, "p", "it works");

        assertEquals(href, await page.url());
      },
    );
  },

  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "throws when PartialSlot is instantiated inside an island",
  async fn() {
    await withPageName(
      "./tests/fixture_partials/main.ts",
      async (_page, _address) => {
        // TODO
      },
    );
  },

  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "injects content with island and keeps island state",
  async fn() {
    await withPageName(
      "./tests/fixture_partials/main.ts",
      async (page, address) => {
        await page.goto(`${address}/island_state`);
        await page.waitForSelector("#output");

        // Update island state
        await page.click(".island button");
        await waitForText(page, "output", "1");

        const href = await page.$eval("a[fh-partial]", (el) => el.href);
        await page.click("a[fh-partial]");
        await waitForText(page, ".status", "it works");

        assertEquals(href, await page.url());

        // Check that island value didn't change
        const text = await page.$eval("output", (el) => el.textContent);
        assertEquals(text, "1");
      },
    );
  },

  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "injects content while keeping nested island state",
  async fn() {
    await withPageName(
      "./tests/fixture_partials/main.ts",
      async (_page, _address) => {
        // TODO
      },
    );
  },

  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "unmounts islands not needed anymore",
  async fn() {
    await withPageName(
      "./tests/fixture_partials/main.ts",
      async (_page, _address) => {
        // TODO
      },
    );
  },

  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "unmounts islands if parent type changes",
  async fn() {
    await withPageName(
      "./tests/fixture_partials/main.ts",
      async (_page, _address) => {
        // TODO
      },
    );
  },

  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "unmounts islands if island type changes",
  async fn() {
    await withPageName(
      "./tests/fixture_partials/main.ts",
      async (_page, _address) => {
        // TODO
      },
    );
  },

  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "replaces islands children server content",
  async fn() {
    await withPageName(
      "./tests/fixture_partials/main.ts",
      async (_page, _address) => {
        // TODO
      },
    );
  },

  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "falls back to full page load when partial URL errors or is missing",
  async fn() {
    await withPageName(
      "./tests/fixture_partials/main.ts",
      async (_page, _address) => {
        // TODO
      },
    );
  },

  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "executes onClick listener",
  async fn() {
    await withPageName(
      "./tests/fixture_partials/main.ts",
      async (_page, _address) => {
        // TODO
      },
    );
  },

  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "sets data-active on active links",
  async fn() {
    await withPageName(
      "./tests/fixture_partials/main.ts",
      async (_page, _address) => {
        // TODO
      },
    );
  },

  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: "sets data-ancestor on active parent links",
  async fn() {
    await withPageName(
      "./tests/fixture_partials/main.ts",
      async (_page, _address) => {
        // TODO
      },
    );
  },

  sanitizeOps: false,
  sanitizeResources: false,
});
