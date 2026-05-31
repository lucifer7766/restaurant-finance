# Restaurant Finance System

ระบบจัดการรายรับรายจ่ายสำหรับร้านอาหาร

## Features ตอนนี้

- Dashboard สรุปรายรับ รายจ่าย กำไร และอัตรากำไร
- Transactions page สำหรับเพิ่มรายการรายรับ/รายจ่าย
- Delete transaction
- Reports page สรุปรายงานรายเดือน
- เชื่อม Supabase database แล้ว
- AI Summary แบบ rule-based

## Current Pages

- `/dashboard`
- `/transactions`
- `/reports`

## Database

ใช้ Supabase table:

- `transactions`

Fields หลัก:

- `id`
- `date`
- `type`
- `category`
- `amount`
- `note`
- `created_at`

## Next Steps

1. Edit Transaction
2. Export CSV
3. Date filter / Category filter
4. Login
5. Real AI Summary
6. Deploy

## How to run

```bash
npm run dev