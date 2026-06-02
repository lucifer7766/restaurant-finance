import { test, expect, Page } from "@playwright/test";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.test.local" });

const EMAIL = process.env.TEST_EMAIL!;
const PASSWORD = process.env.TEST_PASSWORD!;
const FIXTURES = path.join(__dirname, "fixtures");

// ใช้ localhost จาก playwright.config.ts (http://localhost:3000)

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

async function uploadReceiptFile(page: Page, filename: string) {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(path.join(FIXTURES, filename));
}

/* ── Case 1: scan ปกติ (non-image → OCR returns unreadable แต่ modal เปิดได้) ── */

test("Case 1 — modal เปิดได้, ไม่ crash", async ({ page }) => {
  await login(page);
  await page.goto("/expense");
  await page.waitForLoadState("networkidle");

  await uploadReceiptFile(page, "blank.png");
  await expect(page.getByText("ยืนยันรายจ่าย")).toBeVisible({ timeout: 30000 });
});

/* ── Case 2: blank image → OCR unreadable → error banner ขึ้น ── */

test("Case 2 — OCR fail: error banner ขึ้น, ยังกรอกเองได้", async ({ page }) => {
  await login(page);
  await page.goto("/expense");
  await page.waitForLoadState("networkidle");

  await uploadReceiptFile(page, "blank.png");
  await expect(page.getByText("ยืนยันรายจ่าย")).toBeVisible({ timeout: 30000 });

  // ต้องเห็น error banner สีแดง
  await expect(page.getByText(/อ่านใบเสร็จไม่สำเร็จ/)).toBeVisible();

  // amount field กรอกได้
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill("500");
  await expect(amountInput).toHaveValue("500");
});

/* ── Case 3: กรอก manual → import สำเร็จ ── */

test("Case 3 — กรอก manual หลัง OCR fail: import สำเร็จ", async ({ page }) => {
  await login(page);
  await page.goto("/expense");
  await page.waitForLoadState("networkidle");

  await uploadReceiptFile(page, "blank.png");
  await expect(page.getByText("ยืนยันรายจ่าย")).toBeVisible({ timeout: 30000 });

  await page.locator('input[type="number"]').first().fill("100");
  await page.locator('select').first().selectOption("อื่นๆ");
  await page.getByRole("button", { name: /ยืนยัน/ }).click();

  await expect(page.getByText("ยืนยันรายจ่าย")).not.toBeVisible({ timeout: 10000 });
});
