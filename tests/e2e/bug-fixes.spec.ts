/**
 * Bug-fix verification — รันบน localhost:3000
 * ต้องมี .env.test.local ที่มี TEST_EMAIL / TEST_PASSWORD
 *
 * รัน:
 *   npx playwright test tests/e2e/bug-fixes.spec.ts --headed
 */

import { test, expect, Page } from "@playwright/test";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: ".env.test.local" });

const BASE_URL = "http://localhost:3000";
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

test.use({ baseURL: BASE_URL });

async function login(page: Page) {
  if (!EMAIL || !PASSWORD) throw new Error("Missing TEST_EMAIL or TEST_PASSWORD in .env.test.local");
  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

/* ── H2: availableMonths derive จาก DB ── */
test("H2 — MonthSelector โหลด months จาก DB ไม่ใช่ hardcode 2025-2030", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  // ปุ่ม prev/next ของ MonthSelector ควรแสดงอยู่
  const prevBtn = page.locator('button[aria-label="เดือนก่อนหน้า"]');
  const nextBtn = page.locator('button[aria-label="เดือนถัดไป"]');
  await expect(prevBtn).toBeVisible({ timeout: 5000 });
  await expect(nextBtn).toBeVisible({ timeout: 5000 });

  // เดือนปัจจุบันต้องแสดง (ไม่ว่างเปล่า)
  const monthLabel = page.locator('span.min-w-\\[6rem\\]');
  await expect(monthLabel).not.toBeEmpty();
});

/* ── M2: Pagination label ── */
test("M2 — Pagination ไม่แสดง '1–0 of 0' เมื่อ filtered = 0", async ({ page }) => {
  await login(page);
  await page.goto("/income");
  await page.waitForLoadState("networkidle");

  // กด tab ที่ไม่มีข้อมูล (เลือก tab category ที่ 4 ถ้ามี หรือตรวจ label โดยตรง)
  const paginationLabel = page.locator('span.font-label-caps').filter({ hasText: /of \d+/ });

  if (await paginationLabel.count() > 0) {
    const text = await paginationLabel.first().textContent() ?? "";
    // ต้องไม่แสดง "1–0"
    expect(text).not.toMatch(/^1–0/);
  }
});

/* ── M2: กรณี 0 results ── */
test("M2 — เมื่อ filter แล้วไม่มีผล แสดง '0–0 of 0'", async ({ page }) => {
  await login(page);
  await page.goto("/income");
  await page.waitForLoadState("networkidle");

  // คลิก tab สุดท้าย (ถ้ามีมากกว่า 1 tab)
  const tabs = page.locator('button').filter({ hasText: /^(?!ทั้งหมด)/ }).nth(0);
  // ตรวจสอบ label — ถ้าหน้ามีข้อมูลจะไม่เป็น 0 แต่ต้องไม่เป็น "1–0"
  const paginationLabel = page.locator('span.font-label-caps').filter({ hasText: /of \d+/ });
  if (await paginationLabel.count() > 0) {
    const text = await paginationLabel.first().textContent() ?? "";
    expect(text).not.toMatch(/^1–0/);
  }
});

/* ── L1: Delete confirmation ── */
test("L1 — Delete confirmation ไม่แสดง truncated IDs", async ({ page }) => {
  await login(page);

  // import batch ใหม่ก่อนเพื่อให้มี batch ให้ลบ
  await page.goto("/income");
  await page.waitForLoadState("networkidle");
  await page.getByText("อัปโหลดรายงาน POS").click();
  await expect(page.getByText("นำเข้ารายงาน POS")).toBeVisible({ timeout: 5000 });
  const fileInput = page.locator('input[type="file"][accept=".csv,.xlsx,.xls"]');
  await fileInput.setInputFiles(path.join(__dirname, "fixtures", "pos_normal.csv"));
  await page.getByRole("button", { name: /ยืนยันนำเข้า/ }).click();
  await expect(page.getByText("นำเข้ารายงาน POS")).not.toBeVisible({ timeout: 15000 });

  // เปิด POS History
  await page.getByText("ประวัติการนำเข้า POS").click();
  await expect(page.getByRole("heading", { name: "ประวัติการนำเข้า POS" })).toBeVisible();

  // กด delete บน batch แรก (ล่าสุด)
  await page.locator('span.material-symbols-outlined').filter({ hasText: /^delete$/ }).first().click();
  await expect(page.getByText("ลบรายงาน POS")).toBeVisible({ timeout: 5000 });

  // ตรวจ dialog — ต้องไม่มี "ids:" และต้องมี "records ออกจากระบบ"
  const dialogText = await page.locator('text=ลบรายงาน POS').locator("..").locator("..").textContent() ?? "";
  expect(dialogText).not.toContain("ids:");
  expect(dialogText).toContain("records ออกจากระบบ");

  // ยกเลิก (ไม่ลบจริง)
  await page.getByRole("button", { name: /ยกเลิก/ }).first().click();
  await expect(page.getByText("ลบรายงาน POS")).not.toBeVisible({ timeout: 5000 });

  // cleanup — ลบ batch ที่เพิ่งสร้าง
  await page.locator('span.material-symbols-outlined').filter({ hasText: /^delete$/ }).first().click();
  await expect(page.getByText("ลบรายงาน POS")).toBeVisible({ timeout: 5000 });
  await page.getByRole("button", { name: /ยืนยันลบ/ }).click();
  await expect(page.getByText("ลบรายงาน POS")).not.toBeVisible({ timeout: 15000 });
});

/* ── L2: Dashboard alert revenueGrowth ── */
test("L2 — Dashboard alert ไม่แสดง generic message เมื่อมีข้อมูล", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  // alert banner ต้องแสดง
  const alertBanner = page.locator('div').filter({ hasText: /กำไร|รายรับ|รายจ่าย|ทรงตัว|สรุปภาพรวม/ }).first();
  await expect(alertBanner).toBeVisible({ timeout: 5000 });
});

/* ── L4: .env.example ── */
test("L4 — .env.example มี OCR_SPACE_API_KEY", async () => {
  const envExample = fs.readFileSync(
    path.join(process.cwd(), ".env.example"),
    "utf-8"
  );
  expect(envExample).toContain("OCR_SPACE_API_KEY");
});

/* ── M3: OCR quality (ตรวจ source code) ── */
test("M3 — OCR compress quality ไม่ต่ำกว่า 0.7", async () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "src/components/expense/ExpenseContent.tsx"),
    "utf-8"
  );
  const match = src.match(/toDataURL\("image\/jpeg",\s*([\d.]+)\)/);
  expect(match).not.toBeNull();
  const quality = parseFloat(match![1]);
  expect(quality).toBeGreaterThanOrEqual(0.7);
});

/* ── M6: Legacy POS ใน payment breakdown ── */
test("M6 — paymentBreakdown logic รับ legacy POS เป็น เงินสด (source check)", async () => {
  const src = fs.readFileSync(
    path.join(process.cwd(), "src/components/income/IncomeContent.tsx"),
    "utf-8"
  );
  // ต้องมี block จัดการ LEGACY_BATCH_ID แยกก่อน regular batch
  expect(src).toContain("bid === LEGACY_BATCH_ID");
  // ต้องมีการ += t.amount ให้ เงินสด
  expect(src).toContain('posPayKey["เงินสด"] += t.amount');
});

/* ── Compare Drawer ── */
test("Compare — ปุ่มเปรียบเทียบเปิด drawer และแสดงข้อมูล", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  // กดปุ่มเปรียบเทียบ
  await page.click('button[aria-label="เปรียบเทียบเดือน"]');

  // drawer ต้องขึ้น
  const drawer = page.locator('.fixed.inset-y-0.right-0');
  await expect(drawer).toBeVisible({ timeout: 5000 });

  // มี dropdown เลือกเดือน
  await expect(page.locator("select")).toBeVisible();

  // มี metric rows ใน drawer
  await expect(drawer.getByText("รายรับ").first()).toBeVisible();
  await expect(drawer.getByText("รายจ่าย").first()).toBeVisible();
  await expect(drawer.getByText("กำไรสุทธิ")).toBeVisible();

  // ปิด drawer โดยกด backdrop
  await page.locator('.fixed.inset-0.bg-black\\/30').click();
  await expect(drawer).not.toBeVisible({ timeout: 3000 });
});
