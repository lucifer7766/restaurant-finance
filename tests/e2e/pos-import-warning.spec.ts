import { test, expect } from "@playwright/test";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.test.local" });

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const FIXTURES = path.join(__dirname, "fixtures");

test.beforeEach(async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "Missing TEST_EMAIL or TEST_PASSWORD — กรอกใน .env.test.local ก่อนรัน test"
    );
  }

  // Login
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 10000 });

  // Navigate to Income
  await page.goto("/income");
  await page.waitForLoadState("networkidle");

  // Open POS Import modal
  await page.getByText("อัปโหลดรายงาน POS").click();
  await expect(page.getByText("นำเข้ารายงาน POS")).toBeVisible();
});

async function uploadAndWait(page: import("@playwright/test").Page, filename: string) {
  const fileInput = page.locator('input[type="file"][accept=".csv,.xlsx,.xls"]');
  await fileInput.setInputFiles(path.join(FIXTURES, filename));
  // wait for parsing (modal updates synchronously after FileReader)
  await page.waitForTimeout(500);
}

async function closeModal(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /ยกเลิก/ }).first().click();
}

// ── Case 1: ไฟล์ปกติ ─────────────────────────────────────────────────────────

test("Case 1 — ไฟล์ปกติ: ไม่มี warning, preview ถูก, import ได้", async ({ page }) => {
  await uploadAndWait(page, "pos_normal.csv");

  // ไม่มี warning
  await expect(page.getByText(/แถวที่ถูกข้าม/)).not.toBeVisible();

  // preview แสดง 3 categories
  await expect(page.getByText("Food Sales", { exact: true })).toBeVisible();
  await expect(page.getByText("Beverage", { exact: true })).toBeVisible();
  await expect(page.getByText("Delivery", { exact: true })).toBeVisible();

  // import
  await page.getByRole("button", { name: /ยืนยันนำเข้า/ }).click();
  await expect(page.getByText("นำเข้ารายงาน POS")).not.toBeVisible({ timeout: 10000 });

  // POS History ขึ้น
  await expect(page.getByText("ประวัติการนำเข้า POS")).toBeVisible();
});

// ── Case 2: amount = 0 ────────────────────────────────────────────────────────

test("Case 2 — amount = 0: warning ขึ้น, import เฉพาะแถวดี", async ({ page }) => {
  await uploadAndWait(page, "pos_with_zero.csv");

  // warning ขึ้น
  await expect(page.getByText(/มี 1 แถวที่ถูกข้าม/)).toBeVisible();

  // preview มีแค่ 2 categories (Beverage ถูก skip)
  await expect(page.getByText("Food Sales", { exact: true })).toBeVisible();
  await expect(page.getByText("Delivery", { exact: true })).toBeVisible();
  await expect(page.getByText("Beverage", { exact: true })).not.toBeVisible();

  // import สำเร็จ
  await page.getByRole("button", { name: /ยืนยันนำเข้า/ }).click();
  await expect(page.getByText("นำเข้ารายงาน POS")).not.toBeVisible({ timeout: 10000 });
});

// ── Case 3: amount ว่าง ───────────────────────────────────────────────────────

test("Case 3 — amount ว่าง: warning ขึ้น, แถวว่างไม่ถูก import", async ({ page }) => {
  await uploadAndWait(page, "pos_with_empty.csv");

  await expect(page.getByText(/มี 1 แถวที่ถูกข้าม/)).toBeVisible();
  await expect(page.getByText("Food Sales", { exact: true })).toBeVisible();
  await expect(page.getByText("Delivery", { exact: true })).toBeVisible();
  await expect(page.getByText("Beverage", { exact: true })).not.toBeVisible();

  await page.getByRole("button", { name: /ยืนยันนำเข้า/ }).click();
  await expect(page.getByText("นำเข้ารายงาน POS")).not.toBeVisible({ timeout: 10000 });
});

// ── Case 4: amount เป็น NaN ───────────────────────────────────────────────────

test("Case 4 — amount NaN: warning ขึ้น, ระบบไม่ crash", async ({ page }) => {
  await uploadAndWait(page, "pos_with_nan.csv");

  await expect(page.getByText(/มี 1 แถวที่ถูกข้าม/)).toBeVisible();
  await expect(page.getByText("Food Sales", { exact: true })).toBeVisible();
  await expect(page.getByText("Delivery", { exact: true })).toBeVisible();

  // ระบบไม่ crash — ปุ่ม import ยังใช้ได้
  await expect(page.getByRole("button", { name: /ยืนยันนำเข้า/ })).toBeEnabled();

  await page.getByRole("button", { name: /ยืนยันนำเข้า/ }).click();
  await expect(page.getByText("นำเข้ารายงาน POS")).not.toBeVisible({ timeout: 10000 });
});

// ── Case 5: หลัง import — POS History / Edit / Delete ยังใช้ได้ ───────────────

test("Case 5 — หลัง import: POS History ขึ้น, Edit/Delete ใช้ได้", async ({ page }) => {
  await uploadAndWait(page, "pos_normal.csv");
  await page.getByRole("button", { name: /ยืนยันนำเข้า/ }).click();
  await expect(page.getByText("นำเข้ารายงาน POS")).not.toBeVisible({ timeout: 10000 });

  // POS History button ขึ้น
  const historyBtn = page.getByText("ประวัติการนำเข้า POS");
  await expect(historyBtn).toBeVisible();
  await historyBtn.click();

  // History modal เปิดได้
  await expect(page.getByRole("heading", { name: "ประวัติการนำเข้า POS" })).toBeVisible();

  // มีปุ่ม edit และ delete
  await expect(page.locator('span.material-symbols-outlined', { hasText: "edit" }).first()).toBeVisible();
  await expect(page.locator('span.material-symbols-outlined', { hasText: "delete" }).first()).toBeVisible();
});
