import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

test("imports a Timeline file, filters events, and clears memory", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /your journeys/i })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(resolve("tests/fixtures/device-timeline.json"));
  await expect(page.getByText(/of 3 events/i)).toBeVisible();
  await expect(page.getByText("MAPPED DISTANCE")).toBeVisible();
  await page.getByText("Movements").click();
  await expect(page.getByText(/of 3 events/i)).toBeVisible();
  await page.getByRole("button", { name: "Clear data" }).click();
  await expect(page.getByRole("button", { name: "Choose files" })).toBeVisible();
});

test("never sends Timeline contents in a network request", async ({ page }) => {
  const requestBodies: string[] = [];
  const unexpectedHosts: string[] = [];
  page.on("request", (request) => {
    if (request.postData()) requestBodies.push(request.postData() || "");
    const host = new URL(request.url()).hostname;
    if (!["127.0.0.1", "localhost", "tiles.openfreemap.org"].includes(host)) unexpectedHosts.push(host);
  });
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(resolve("tests/fixtures/device-timeline.json"));
  await expect(page.getByText(/of 3 events/i)).toBeVisible();
  expect(requestBodies.join(" ")).not.toContain("semanticSegments");
  expect(requestBodies.join(" ")).not.toContain("synthetic-place");
  expect([...new Set(unexpectedHosts)]).toEqual([]);
});

test("opens mobile filters as a bottom sheet", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile-only layout assertion");
  await page.goto("/");
  await page.getByRole("button", { name: "Explore synthetic demo" }).click();
  await page.getByRole("button", { name: "Filters" }).click();
  await expect(page.getByText("Filters & timeline")).toBeVisible();
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(page.getByText("Filters & timeline")).not.toBeVisible();
});

test("creates and downloads a local journey short", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Full browser encoding smoke test runs once in Chromium");
  await page.goto("/");
  await page.getByRole("button", { name: "Explore synthetic demo" }).click();
  await page.getByRole("button", { name: "Create short" }).first().click();
  await expect(page.getByRole("dialog", { name: "Create a moving memory." })).toBeVisible();
  await page.getByRole("button", { name: "10s" }).click();
  await page.getByRole("button", { name: "No music" }).click();
  await page.getByRole("button", { name: "Private minimal" }).click();
  await page.getByRole("button", { name: "Create video" }).click();
  const downloadButton = page.getByRole("button", { name: /Download (MP4|WEBM)/ });
  await expect(downloadButton).toBeVisible({ timeout: 25_000 });
  const downloadPromise = page.waitForEvent("download");
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^timeline-journey\.(mp4|webm)$/);
});
