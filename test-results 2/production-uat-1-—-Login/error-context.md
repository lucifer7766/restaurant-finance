# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: production-uat.spec.ts >> 1 — Login
- Location: tests/e2e/production-uat.spec.ts:40:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('PLU').first()
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('PLU').first()
    14 × locator resolved to <h1 class="font-headline-md text-headline-md font-bold text-primary lg:hidden">PLU</h1>
       - unexpected value "hidden"

```

```yaml
- alert
- banner:
  - button "เดือนก่อนหน้า": chevron_left
  - text: มิถุนายน 2569
  - button "เดือนถัดไป": chevron_right
- complementary:
  - text: restaurant
  - heading "PLU" [level=2]
  - paragraph: Bistro Management
  - navigation:
    - link "dashboard แดชบอร์ด":
      - /url: /dashboard
    - link "payments รายรับ":
      - /url: /income
    - link "receipt_long รายจ่าย":
      - /url: /expense
    - link "leaderboard รายงานกำไร":
      - /url: /reports
    - link "analytics วิเคราะห์ต้นทุน":
      - /url: /cost-analysis
  - paragraph: weerakitt09876@gmail.com
  - button "logout ออกจากระบบ"
- main:
  - heading "สรุปภาพรวมธุรกิจ" [level=2]
  - paragraph: ข้อมูลล่าสุดประจำเดือนนี้ · มิถุนายน 2569
  - link "add_circle เพิ่มรายรับ":
    - /url: /income/new
  - link "remove_circle เพิ่มรายจ่าย":
    - /url: /expense/new
  - text: trending_up
  - paragraph: กำไรเดือนนี้เพิ่มขึ้น 9.4% จากเดือนก่อน
  - text: chevron_right รายรับเดือนนี้ ฿ 820,000 trending_up +9.4% รายจ่ายเดือนนี้ ฿ 611,156 trending_up +3.0% กำไรสุทธิ ฿ 208,844 อัตรากำไร 25.5% เงินสดคงเหลือ (สะสม) ฿ 821,340
  - heading "แนวโน้มรายรับ vs รายจ่าย" [level=3]
  - paragraph: สะสมรายสัปดาห์ · มิถุนายน 2569
  - text: รายรับ รายจ่าย
  - img "รายรับและรายจ่ายรายสัปดาห์": 0 195K 390K 585K 780K 7 มิ.ย. 14 มิ.ย. 21 มิ.ย.
  - heading "สัดส่วนรายจ่ายตามหมวดหมู่" [level=3]
  - text: receipt_long
  - paragraph: วัตถุดิบ
  - paragraph: ฿286,156.00
  - paragraph: 46.8%
  - text: receipt_long
  - paragraph: ค่าแรง
  - paragraph: ฿145,000.00
  - paragraph: 23.7%
  - text: receipt_long
  - paragraph: ค่าเช่า
  - paragraph: ฿55,000.00
  - paragraph: 9.0%
  - text: receipt_long
  - paragraph: การตลาด
  - paragraph: ฿50,000.00
  - paragraph: 8.2%
  - text: receipt_long
  - paragraph: บรรจุภัณฑ์
  - paragraph: ฿43,000.00
  - paragraph: 7.0%
  - text: receipt_long
  - paragraph: ค่าน้ำค่าไฟ
  - paragraph: ฿32,000.00
  - paragraph: 5.2%
  - heading "รายการล่าสุด" [level=3]
  - button "รายการทั้งหมด"
  - text: arrow_downward
  - paragraph: วัตถุดิบประจำสัปดาห์ที่ 4
  - paragraph: วัตถุดิบ · 23 มิ.ย. 2569
  - text: "-฿45,000.00 arrow_upward"
  - paragraph: โอนเงิน (Transfer) — Shopee Food
  - paragraph: เดลิเวอรี · 22 มิ.ย. 2569
  - text: +฿40,000.00 arrow_downward
  - paragraph: เงินเดือนเชฟและพนักงานเสิร์ฟ
  - paragraph: ค่าแรง · 21 มิ.ย. 2569
  - text: "-฿145,000.00 arrow_downward"
  - paragraph: ค่าไฟฟ้าสาขา 1
  - paragraph: ค่าน้ำค่าไฟ · 20 มิ.ย. 2569
  - text: "-฿32,000.00 arrow_upward"
  - paragraph: โอนเงิน (Transfer) — บริการโต๊ะสัปดาห์ที่ 3
  - paragraph: ยอดขายอาหาร · 20 มิ.ย. 2569
  - text: +฿50,000.00
```

# Test source

```ts
  1   | import { test, expect, Page } from "@playwright/test";
  2   | import path from "path";
  3   | import * as dotenv from "dotenv";
  4   | 
  5   | dotenv.config({ path: ".env.test.local" });
  6   | 
  7   | const BASE_URL = "https://restaurant-finance-g25p-qy42zxjyi-verrakitt-s-projects.vercel.app";
  8   | const EMAIL = process.env.TEST_EMAIL;
  9   | const PASSWORD = process.env.TEST_PASSWORD;
  10  | const FIXTURES = path.join(__dirname, "fixtures");
  11  | 
  12  | test.use({ baseURL: BASE_URL });
  13  | 
  14  | /* ── helpers ── */
  15  | 
  16  | async function login(page: Page) {
  17  |   if (!EMAIL || !PASSWORD) throw new Error("Missing TEST_EMAIL or TEST_PASSWORD in .env.test.local");
  18  |   await page.goto("/login");
  19  |   await page.fill("#email", EMAIL);
  20  |   await page.fill("#password", PASSWORD);
  21  |   await page.click('button[type="submit"]');
  22  |   await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  23  | }
  24  | 
  25  | async function openPosModal(page: Page) {
  26  |   await page.goto("/income");
  27  |   await page.waitForLoadState("networkidle");
  28  |   await page.getByText("อัปโหลดรายงาน POS").click();
  29  |   await expect(page.getByText("นำเข้ารายงาน POS")).toBeVisible({ timeout: 5000 });
  30  | }
  31  | 
  32  | async function uploadCsv(page: Page, filename: string) {
  33  |   const fileInput = page.locator('input[type="file"][accept=".csv,.xlsx,.xls"]');
  34  |   await fileInput.setInputFiles(path.join(FIXTURES, filename));
  35  |   await page.waitForTimeout(800);
  36  | }
  37  | 
  38  | /* ── 1. Login ── */
  39  | 
  40  | test("1 — Login", async ({ page }) => {
  41  |   await login(page);
  42  |   await expect(page).toHaveURL(/\/dashboard/);
> 43  |   await expect(page.getByText("PLU").first()).toBeVisible();
      |                                               ^ Error: expect(locator).toBeVisible() failed
  44  | });
  45  | 
  46  | /* ── 2. POS Import ไฟล์ปกติ ── */
  47  | 
  48  | test("2 — POS Import ไฟล์ปกติ: ไม่มี warning, import สำเร็จ", async ({ page }) => {
  49  |   await login(page);
  50  |   await openPosModal(page);
  51  |   await uploadCsv(page, "pos_normal.csv");
  52  | 
  53  |   await expect(page.getByText(/แถวที่ถูกข้าม/)).not.toBeVisible();
  54  |   await expect(page.getByText("Food Sales", { exact: true })).toBeVisible();
  55  |   await expect(page.getByText("Beverage", { exact: true })).toBeVisible();
  56  |   await expect(page.getByText("Delivery", { exact: true })).toBeVisible();
  57  | 
  58  |   await page.getByRole("button", { name: /ยืนยันนำเข้า/ }).click();
  59  |   await expect(page.getByText("นำเข้ารายงาน POS")).not.toBeVisible({ timeout: 15000 });
  60  | });
  61  | 
  62  | /* ── 3a. POS Import amount = 0 → warning ── */
  63  | 
  64  | test("3a — POS Import amount=0: warning ขึ้น, แถวดี import ได้", async ({ page }) => {
  65  |   await login(page);
  66  |   await openPosModal(page);
  67  |   await uploadCsv(page, "pos_with_zero.csv");
  68  | 
  69  |   await expect(page.getByText(/มี 1 แถวที่ถูกข้าม/)).toBeVisible();
  70  |   await expect(page.getByText("Food Sales", { exact: true })).toBeVisible();
  71  |   await expect(page.getByText("Delivery", { exact: true })).toBeVisible();
  72  |   await expect(page.getByText("Beverage", { exact: true })).not.toBeVisible();
  73  | 
  74  |   // ยกเลิก — ไม่ต้อง import ซ้ำใน production
  75  |   await page.getByRole("button", { name: /ยกเลิก/ }).first().click();
  76  | });
  77  | 
  78  | /* ── 3b. POS Import amount ว่าง → warning ── */
  79  | 
  80  | test("3b — POS Import amount ว่าง: warning ขึ้น", async ({ page }) => {
  81  |   await login(page);
  82  |   await openPosModal(page);
  83  |   await uploadCsv(page, "pos_with_empty.csv");
  84  | 
  85  |   await expect(page.getByText(/มี 1 แถวที่ถูกข้าม/)).toBeVisible();
  86  |   await page.getByRole("button", { name: /ยกเลิก/ }).first().click();
  87  | });
  88  | 
  89  | /* ── 4. POS History ขึ้นถูก ── */
  90  | 
  91  | test("4 — POS History: แสดง batch, categories, payment breakdown", async ({ page }) => {
  92  |   await login(page);
  93  |   await page.goto("/income");
  94  |   await page.waitForLoadState("networkidle");
  95  | 
  96  |   // ปุ่มประวัติ POS ต้องขึ้น (ต้องมี batch อยู่แล้วจาก test 2)
  97  |   const historyBtn = page.getByText("ประวัติการนำเข้า POS");
  98  |   await expect(historyBtn).toBeVisible({ timeout: 10000 });
  99  |   await historyBtn.click();
  100 | 
  101 |   // drawer เปิด
  102 |   await expect(page.getByRole("heading", { name: "ประวัติการนำเข้า POS" })).toBeVisible();
  103 | 
  104 |   // มีอย่างน้อย 1 batch card ที่แสดงยอดเงิน
  105 |   await expect(page.locator(".metric-card").first()).toBeVisible();
  106 | });
  107 | 
  108 | /* ── 5. POS Edit ── */
  109 | 
  110 | test("5 — POS Edit: เปิด modal, แก้ category, บันทึกสำเร็จ", async ({ page }) => {
  111 |   await login(page);
  112 |   await page.goto("/income");
  113 |   await page.waitForLoadState("networkidle");
  114 | 
  115 |   await page.getByText("ประวัติการนำเข้า POS").click();
  116 |   await expect(page.getByRole("heading", { name: "ประวัติการนำเข้า POS" })).toBeVisible();
  117 | 
  118 |   // คลิก edit บน batch แรก (ใช้ regex ^edit$ เพื่อไม่ match "credit_card")
  119 |   await page.locator('span.material-symbols-outlined').filter({ hasText: /^edit$/ }).first().click();
  120 |   await expect(page.getByText("แก้ไขรายงาน POS")).toBeVisible({ timeout: 5000 });
  121 | 
  122 |   // แก้ category ของ row แรก (เพิ่ม space แล้วลบออก = ไม่เปลี่ยน logic)
  123 |   const categoryInput = page.locator('input[type="text"], input:not([type])').first();
  124 |   const originalValue = await categoryInput.inputValue();
  125 |   await categoryInput.fill(originalValue + " ");
  126 |   await categoryInput.fill(originalValue); // reset กลับ
  127 | 
  128 |   // กดบันทึก
  129 |   await page.getByRole("button", { name: /บันทึก/ }).click();
  130 |   // modal ปิด = สำเร็จ
  131 |   await expect(page.getByText("แก้ไขรายงาน POS")).not.toBeVisible({ timeout: 15000 });
  132 | });
  133 | 
  134 | /* ── 6. POS Delete ── */
  135 | 
  136 | test("6 — POS Delete: ลบ batch ล่าสุด แล้วหายจาก History", async ({ page }) => {
  137 |   await login(page);
  138 |   await page.goto("/income");
  139 |   await page.waitForLoadState("networkidle");
  140 | 
  141 |   await page.getByText("ประวัติการนำเข้า POS").click();
  142 |   await expect(page.getByRole("heading", { name: "ประวัติการนำเข้า POS" })).toBeVisible();
  143 | 
```