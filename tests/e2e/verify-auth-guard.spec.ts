import { test, expect } from "@playwright/test";

const BASE = "https://restaurant-finance-g25p-qy42zxjyi-verrakitt-s-projects.vercel.app";
const ROUTES = ["/dashboard", "/income", "/expense", "/reports", "/cost-analysis", "/transactions"];

for (const route of ROUTES) {
  test(`Unauthed → ${route}`, async ({ browser }) => {
    // fresh context = no cookies, no session
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE + route);
    await page.waitForLoadState("networkidle");
    const landed = page.url();
    console.log(`${route} → ${landed}`);
    await ctx.close();
    // ถ้า protected จะ redirect ไป /login
    expect(landed, `${route} ควร redirect ไป /login`).toContain("/login");
  });
}
