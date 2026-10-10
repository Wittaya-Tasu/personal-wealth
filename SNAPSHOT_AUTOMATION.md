# Snapshot อัตโนมัติ v2.14.0

เพิ่ม Header report_json ต่อท้าย MonthlySnapshots และแทนไฟล์ Apps Script เดิมด้วย MONTH_END_SNAPSHOT.gs ทั้งไฟล์ ไม่สร้างฟังก์ชันซ้ำ ไม่ติดตั้ง Trigger ซ้ำหากมีอยู่แล้ว
อ่าน [MONTHLY_REPORT_MIGRATION.md](MONTHLY_REPORT_MIGRATION.md) ก่อนทำ

## คู่มือการติดตั้งพื้นฐานเดิม

# ติดตั้ง Snapshot สิ้นเดือนอัตโนมัติ — v2.12.0

GitHub Pages และ PWA ไม่สามารถทำงานเองเมื่อปิดแอป รุ่นนี้จึงใช้ Google Apps Script ที่ผูกกับ Google Sheet เพื่อบันทึก Snapshot แม้ไม่ได้เปิด WebApp

## อัปเดตจากรุ่นเดิม

หากติดตั้ง Trigger ไว้แล้ว ให้เปิดไฟล์ Script เดิมที่มี `runMonthEndSnapshot` แล้วแทนโค้ดทั้งหมดด้วย `MONTH_END_SNAPSHOT.gs` จาก ZIP v2.12.0 จากนั้น Save ไม่ต้องสร้างไฟล์ที่มีฟังก์ชันซ้ำหรือรันติดตั้ง Trigger ใหม่

รุ่นนี้ทำให้ Investments โหมด Principal ใช้เงินต้น ส่วนโหมด Market ใช้มูลค่าที่กรอก รวมถึงมูลค่า 0 เพื่อให้ยอด Snapshot ตรงกับหน้าเว็บ

ดูการเพิ่มคอลัมน์และรายละเอียดใน [WEALTH_LIFETIME_MIGRATION.md](WEALTH_LIFETIME_MIGRATION.md)

## วิธีติดตั้งครั้งเดียว

1. เปิด Google Sheet ที่ใช้กับ Personal Wealth
2. ไปที่ `ส่วนขยาย (Extensions)` > `Apps Script`
3. สร้างไฟล์ Script แล้วคัดลอกโค้ดทั้งหมดจาก `MONTH_END_SNAPSHOT.gs` ไปวาง
4. กด Save
5. เลือกฟังก์ชัน `installMonthEndSnapshotTrigger`
6. กด Run และอนุญาตสิทธิ์ให้ Script
7. ในหน้า Triggers ควรเห็น `runMonthEndSnapshot` ทำงานแบบ Time-driven วันละครั้ง

Trigger ทำงานประมาณ 23:30 น. ตามเขตเวลา `Asia/Bangkok` ในทุกวัน แต่จะเขียนข้อมูลเฉพาะวันสุดท้ายของเดือน และจะอัปเดตแถวเดิมหากเดือนนั้นมี Snapshot อยู่แล้ว

## ทดสอบทันที

เลือกฟังก์ชัน `testMonthEndSnapshotNow` แล้วกด Run จากนั้นตรวจชีต `MonthlySnapshots` ว่ามีแถวของเดือนปัจจุบัน

การทดสอบจะ Upsert เดือนปัจจุบัน จึงไม่สร้างเดือนซ้ำ หากมี Snapshot เดิม ระบบจะเขียนทับด้วยยอดปัจจุบัน

## สูตรที่ใช้

- Total Assets ใช้กติกาเดียวกับหน้า Dashboard: Accounts (เมื่อตั้งค่าให้นับ), Investments และ Assets
- Total Liabilities ใช้ `Liabilities.total_amount`
- Net Worth = Total Assets − Total Liabilities
- Monthly Cash Flow = Income − Expense ของเดือนนั้น
- CreditCardPayment ไม่นับเป็น Expense ซ้ำ

## ข้อจำกัด

- Apps Script เรียก Trigger ภายในช่วงเวลาประมาณการ ไม่รับประกันวินาทีที่แน่นอน
- ยอดที่บันทึกคือข้อมูลล่าสุดใน Google Sheet ณ เวลาที่ Trigger ทำงาน
- หากปิด Trigger, ถอนสิทธิ์ Script หรือเจ้าของไฟล์ถูกระงับ ระบบจะไม่บันทึกอัตโนมัติ
- ปุ่ม Snapshot แบบเดิมยังคงไว้เป็นทางเลือกสำรอง
