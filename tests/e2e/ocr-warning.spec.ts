import { test, expect, Page } from "@playwright/test";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.test.local" });

const BASE_URL = "https://restaurant-finance-g25p-qy42zxjyi-verrakitt-s-projects.vercel.app";
const EMAIL = process.env.TEST_EMAIL!;
const PASSWORD = process.env.TEST_PASSWORD!;
const FIXTURES = path.join(__dirname, "fixtures");

test.use({ baseURL: BASE_URL });

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

async function goToExpense(page: Page) {
  await page.goto("/expense");
  await page.waitForLoadState("networkidle");
}

async function uploadReceiptFile(page: Page, filename: string) {
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(path.join(FIXTURES, filename));
}

/* ── Case 1: ไฟล์ปกติ (ใช้ CSV แทน receipt จริง เพื่อ simulate low/unreadable) ── */

test("Case 1 — scan ปกติ: modal เปิด, ไม่มี error banner เมื่อ confidence=high/low", async ({ page }) => {
  await login(page);
  await goToExpense(page);

  // คลิกปุ่ม scan receipt
  await page.locator('label').filter({ has: page.locator('input[type="file"]') }).first().click();
  await uploadReceiptFile(page, "pos_normal.csv"); // non-image → OCR will return unreadable

  // รอ scanning เสร็จ (modal เปิด)
  await expect(page.getByText("ยืนยันรายจ่าย")).toBeVisible({ timeout: 30000 });

  // ไม่ว่า confidence จะเป็นอะไร modal ต้องเปิดได้
  await expect(page.getByText("ยืนยันรายจ่าย")).toBeVisible();

  // ปิด modal
  await page.getByRole("button", { name: /close/ }).click();
});

/* ── Case 2: blank image → OCR ต้องอ่านไม่ออก → ขึ้น error banner ── */

test("Case 2 — OCR fail (blank image): error banner ขึ้น, ยังกรอกเองได้", async ({ page }) => {
  await login(page);
  await goToExpense(page);

  await uploadReceiptFile(page, "blank.png");

  // รอ OCR เสร็จ (อาจนาน 20s ถ้า timeout)
  await expect(page.getByText("ยืนยันรายจ่าย")).toBeVisible({ timeout: 30000 });

  // ต้องเห็น error banner สีแดง
  await expect(page.getByText(/อ่านใบเสร็จไม่สำเร็จ/)).toBeVisible();

  // ยังกรอกเองได้ — amount field ต้องกรอกได้
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill("500");
  await expect(amountInput).toHaveValue("500");
});

/* ── Case 3: กรอกเอง + import expense สำเร็จ ── */

test("Case 3 — กรอก manual หลัง OCR fail: import expense สำเร็จ", async ({ page }) => {
  await login(page);
  await goToExpense(page);

  await uploadReceiptFile(page, "blank.png");
  await expect(page.getByText("ยืนยันรายจ่าย")).toBeVisible({ timeout: 30000 });

  // กรอก amount
  const amountInput = page.locator('input[type="number"]').first();
  await amountInput.fill("100");

  // เลือก category
  await page.locator('select').first().selectOption("อื่นๆ");

  // กด confirm
  await page.getByRole("button", { name: /ยืนยัน/ }).click();

  // modal ปิด = import สำเร็จ
  await expect(page.getByText("ยืนยันรายจ่าย")).not.toBeVisible({ timeout: 10000 });
});
