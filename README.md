# STK Manager Pro

ระบบจัดการสต็อกวัสดุด้วย Next.js, Prisma และ PostgreSQL/Supabase

## ใช้งาน Local

```bash
npm install
npm run dev
```

เปิด `http://localhost:3000`

## Environment Variables

คัดลอกไฟล์ตัวอย่าง:

```bash
copy .env.example .env
```

ตั้งค่า `DATABASE_URL` เป็น connection string จาก Supabase

```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
EXCEL_IMPORT_PATH="../สรุปรายการวัสดุเดือน เม.ย.69.xlsx"
```

## Database Setup

หลังจากใส่ `DATABASE_URL` แล้ว ให้รัน:

```bash
npm run db:generate
npm run db:push
npm run db:import
```

คำสั่ง `db:import` จะนำเข้าข้อมูลจาก Excel ตาม `EXCEL_IMPORT_PATH`

## Deploy: GitHub + Vercel + Supabase

1. สร้างโปรเจกต์ Supabase Free
2. Copy connection string แบบ `Transaction pooler` จาก Supabase
3. ใส่ค่าใน Vercel Environment Variables ชื่อ `DATABASE_URL`
4. Push repo นี้ขึ้น GitHub
5. Import repo เข้า Vercel
6. Deploy
7. หลัง deploy ครั้งแรก ให้รัน `npm run db:push` และ `npm run db:import` จากเครื่อง local โดยใช้ `DATABASE_URL` ของ Supabase

## Scripts

```bash
npm run dev        # รันเว็บ local
npm run build      # build production
npm run lint       # ตรวจ lint
npm run db:push    # สร้าง/อัปเดตตารางใน database
npm run db:import  # import ข้อมูลจาก Excel
```

## หมายเหตุ

- Production ต้องใช้ PostgreSQL/Supabase ไม่ใช้ SQLite
- `.env` ห้าม commit ขึ้น GitHub
- `.env.example` commit ได้ เพราะไม่มีรหัสจริง
