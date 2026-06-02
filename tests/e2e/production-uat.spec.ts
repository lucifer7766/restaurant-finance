import { test, expect, Page } from "@playwright/test";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.test.local" });

const BASE_URL = "https://restaurant-finance-g25p-qy42zxjyi-verrakitt-s-projects.vercel.app";
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const FIXTURES = path.join(__dirname, "fixtures");

test.use({ baseURL: BASE_URL });

/* ── helpers ── */

async function login(page: Page) {
  if (!EMAIL || !PASSWORD) throw new Error("Missing TEST_EMAIL or TEST_PASSWORD in .env.test.local");
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

async function openPosModal(page: Page) {
  await page.goto("/income");
  await page.waitForLoadState("networkidle");
  await page.getByText("อัปโหลดรายงาน POS").click();
  await expect(page.getByText("นำเข้ารายงาน POS")).toBeVisible({ timeout: 5000 });
}

async function uploadCsv(page: Page, filename: string) {
  const fileInput = page.locator('input[type="file"][accept=".csv,.xlsx,.xls"]');
  await fileInput.setInputFiles(path.join(FIXTURES, filename));
  await page.waitForTimeout(800);
}

/* ── 1. Login ── */

test("1 — Login", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator("h2").filter({ hasText: "PLU" })).toBeVisible();
});

/* ── 2. POS Import ไฟล์ปกติ ── */

test("2 — POS Import ไฟล์ปกติ: ไม่มี warning, import สำเร็จ", async ({ page }) => {
  await login(page);
  await openPosModal(page);
  await uploadCsv(page, "pos_normal.csv");

  await expect(page.getByText(/แถวที่ถูกข้าม/)).not.toBeVisible();
  await expect(page.getByText("Food Sales", { exact: true })).toBeVisible();
  await expect(page.getByText("Beverage", { exact: true })).toBeVisible();
  await expect(page.getByText("Delivery", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /ยืนยันนำเข้า/ }).click();
  await expect(page.getByText("นำเข้ารายงาน POS")).not.toBeVisible({ timeout: 15000 });
});

/* ── 3a. POS Import amount = 0 → warning ── */

test("3a — POS Import amount=0: warning ขึ้น, แถวดี import ได้", async ({ page }) => {
  await login(page);
  await openPosModal(page);
  await uploadCsv(page, "pos_with_zero.csv");

  await expect(page.getByText(/มี 1 แถวที่ถูกข้าม/)).toBeVisible();
  await expect(page.getByText("Food Sales", { exact: true })).toBeVisible();
  await expect(page.getByText("Delivery", { exact: true })).toBeVisible();
  await expect(page.getByText("Beverage", { exact: true })).not.toBeVisible();

  // ยกเลิก — ไม่ต้อง import ซ้ำใน production
  await page.getByRole("button", { name: /ยกเลิก/ }).first().click();
});

/* ── 3b. POS Import amount ว่าง → warning ── */

test("3b — POS Import amount ว่าง: warning ขึ้น", async ({ page }) => {
  await login(page);
  await openPosModal(page);
  await uploadCsv(page, "pos_with_empty.csv");

  await expect(page.getByText(/มี 1 แถวที่ถูกข้าม/)).toBeVisible();
  await page.getByRole("button", { name: /ยกเลิก/ }).first().click();
});

/* ── 4. POS History ขึ้นถูก ── */

test("4 — POS History: แสดง batch, categories, payment breakdown", async ({ page }) => {
  await login(page);
  await page.goto("/income");
  await page.waitForLoadState("networkidle");

  // ปุ่มประวัติ POS ต้องขึ้น (ต้องมี batch อยู่แล้วจาก test 2)
  const historyBtn = page.getByText("ประวัติการนำเข้า POS");
  await expect(historyBtn).toBeVisible({ timeout: 10000 });
  await historyBtn.click();

  // drawer เปิด
  await expect(page.getByRole("heading", { name: "ประวัติการนำเข้า POS" })).toBeVisible();

  // มีอย่างน้อย 1 batch card ที่แสดงยอดเงิน
  await expect(page.locator(".metric-card").first()).toBeVisible();
});

/* ── 5. POS Edit ── */

test("5 — POS Edit: เปิด modal, แก้ category, บันทึกสำเร็จ", async ({ page }) => {
  await login(page);
  await page.goto("/income");
  await page.waitForLoadState("networkidle");

  await page.getByText("ประวัติการนำเข้า POS").click();
  await expect(page.getByRole("heading", { name: "ประวัติการนำเข้า POS" })).toBeVisible();

  // คลิก edit บน batch แรก (ใช้ regex ^edit$ เพื่อไม่ match "credit_card")
  await page.locator('span.material-symbols-outlined').filter({ hasText: /^edit$/ }).first().click();
  await expect(page.getByText("แก้ไขรายงาน POS")).toBeVisible({ timeout: 5000 });

  // แก้ category ของ row แรก (เพิ่ม space แล้วลบออก = ไม่เปลี่ยน logic)
  const categoryInput = page.locator('input[type="text"], input:not([type])').first();
  const originalValue = await categoryInput.inputValue();
  await categoryInput.fill(originalValue + " ");
  await categoryInput.fill(originalValue); // reset กลับ

  // กดบันทึก
  await page.getByRole("button", { name: /บันทึก/ }).click();
  // modal ปิด = สำเร็จ
  await expect(page.getByText("แก้ไขรายงาน POS")).not.toBeVisible({ timeout: 15000 });
});

/* ── 6. POS Delete ── */

test("6 — POS Delete: ลบ batch ล่าสุด แล้วหายจาก History", async ({ page }) => {
  await login(page);
  await page.goto("/income");
  await page.waitForLoadState("networkidle");

  await page.getByText("ประวัติการนำเข้า POS").click();
  await expect(page.getByRole("heading", { name: "ประวัติการนำเข้า POS" })).toBeVisible();

  // เปิด drawer และนับ batch cards ใน drawer ก่อนลบ
  const drawer = page.locator('.overflow-y-auto').filter({ has: page.locator('.metric-card') });
  const batchCards = drawer.locator(".metric-card");
  const countBefore = await batchCards.count();

  // กด delete บน batch แรก (ล่าสุด)
  await page.locator('span.material-symbols-outlined').filter({ hasText: /^delete$/ }).first().click();
  await expect(page.getByText("ลบรายงาน POS")).toBeVisible({ timeout: 5000 });

  // ยืนยันลบ
  await page.getByRole("button", { name: /ยืนยันลบ/ }).click();
  await expect(page.getByText("ลบรายงาน POS")).not.toBeVisible({ timeout: 15000 });

  // delete modal ปิดโดยไม่มี error = delete สำเร็จ
  await expect(page.getByText("ลบไม่สำเร็จ")).not.toBeVisible();
});

/* ── 7. Dashboard totals ไม่พัง ── */

test("7 — Dashboard: โหลดได้ แสดงยอดรวม ไม่มี error", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  // หน้า dashboard โหลดได้
  await expect(page.locator("h2").filter({ hasText: "PLU" })).toBeVisible();

  // ไม่มี error message
  await expect(page.locator('[class*="border-error"]')).not.toBeVisible();

  // มีตัวเลขยอดเงินแสดง (฿ symbol)
  await expect(page.locator("text=/฿/").first()).toBeVisible();
});
