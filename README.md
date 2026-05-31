# PLU — Restaurant Finance System

ระบบจัดการรายรับรายจ่ายสำหรับร้านอาหาร พร้อมใช้งานจริง

**Status: Ready for Pilot**

---

## Features

- **Dashboard** — สรุปภาพรวมธุรกิจ: รายรับ, รายจ่าย, กำไรสุทธิ, อัตรากำไร, กำไรวันนี้, chart แนวโน้ม, expense breakdown, รายการล่าสุด
- **Transactions** — จัดการรายรับ/รายจ่ายทั้งหมด: เพิ่ม, แก้ไข, ลบ, ค้นหา, กรองตามประเภท/หมวดหมู่, Export CSV/Excel
- **Reports** — รายงานสรุปรวม: 4 metric cards, financial chart, AI summary (rule-based), expense breakdown table, Export CSV/Excel
- **Smart Month Sync** — auto-select เดือนล่าสุดที่มีข้อมูลเมื่อเปิดระบบครั้งแรก
- **Responsive** — ใช้ได้ทั้ง Desktop (sidebar) และ Mobile (bottom navigation)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Design System | Kinrai Ledger (Manrope, Work Sans, JetBrains Mono) |
| Database | Supabase (PostgreSQL) |
| Icons | Material Symbols Outlined |
| Export | SheetJS (xlsx) |
| Deploy | Vercel |

---

## Environment Variables

สร้างไฟล์ `.env.local` ที่ root ของโปรเจกต์:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

หาค่าได้ที่: Supabase Dashboard → Project Settings → API

---

## Database Schema

ตาราง `transactions` ใน Supabase:

```sql
create table transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric not null,
  note text,
  created_at timestamptz default now()
);
```

ดูไฟล์เต็มได้ที่ `supabase/schema.sql`

### RLS Policy

ต้องมี RLS policies ให้ anon key อ่าน/เขียนได้ หรือ Disable RLS ระหว่าง pilot:

```sql
-- อนุญาต anon ทุก operation (สำหรับ pilot)
create policy "Allow all for anon" on transactions
  for all using (true) with check (true);
```

---

## Run Locally

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. สร้าง .env.local (ใส่ Supabase keys)
cp .env.example .env.local

# 3. รันระบบ
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) — จะ redirect ไป `/dashboard` อัตโนมัติ

---

## Deploy บน Vercel

### ขั้นตอน

1. **Push โค้ดขึ้น GitHub**
   ```bash
   git add .
   git commit -m "feat: PLU Finance System - production ready"
   git push origin main
   ```

2. **เปิด [vercel.com](https://vercel.com)** → Login → "Add New Project"

3. **Import GitHub repository** → เลือก repo นี้

4. **ตั้งค่า Environment Variables** ก่อนกด Deploy:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

5. **กด Deploy** — Vercel รัน `npm run build` อัตโนมัติ

6. เปิด URL ที่ Vercel ให้มา — ระบบพร้อมใช้งาน

---

## Routes

| URL | หน้า |
|-----|------|
| `/` | Redirect → `/dashboard` |
| `/dashboard` | สรุปภาพรวมธุรกิจ |
| `/transactions` | รายการรายรับ/รายจ่าย |
| `/reports` | รายงานสรุปรวม |

---

## Project Status

**Phase 1–5 เสร็จแล้ว — Ready for Pilot**
