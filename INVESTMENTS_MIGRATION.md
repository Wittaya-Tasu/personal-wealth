# Investments Migration — Personal Wealth v2.3.0+

รุ่น v2.3.0 เพิ่มการเลือกบัญชีต้นทางเมื่อบันทึก Investment และปรับ `Accounts.balance` อัตโนมัติ จึงต้องเพิ่ม Header ต่อท้ายชีต `Investments` ก่อน Deploy Code

## Header ที่ต้องเพิ่ม

โครงสร้างเดิมของชีต `Investments` สิ้นสุดที่คอลัมน์ I (`note`) ให้เพิ่มเฉพาะสองช่องต่อท้ายดังนี้

| Cell | Header | ความหมาย |
|---|---|---|
| J1 | `account_from` | ชื่อ Account ที่ใช้เงินลงทุน |
| K1 | `funded_amount` | เงินลงทุนที่หักจาก Account |

ห้ามแทรกคอลัมน์กลางตาราง ห้ามเปลี่ยนชื่อ Header เดิม และไม่ต้องกรอกค่า J–K ให้ข้อมูล Investment เก่า

## ลำดับดำเนินการ

1. สำรอง Google Sheet และ Repository
2. เปิดชีต `Investments`
3. ใส่ `account_from` ที่ J1
4. ใส่ `funded_amount` ที่ K1
5. ตรวจว่า A1–I1 เดิมไม่เปลี่ยน
6. Deploy ไฟล์ v2.3.0 หรือใหม่กว่า
7. ปิด PWA เดิม เปิดใหม่ และกด Refresh

## กติกาหลัง Migration

| การกระทำ | ผลต่อ Accounts |
|---|---|
| เพิ่มชื่อ Investment ใหม่ | หักเงินรอบใหม่จาก `account_from` และสร้างแถวใหม่ |
| เติมเงินใน Investment เดิม (v2.4.0+) | หักเฉพาะเงินรอบใหม่ แล้วเพิ่ม `current_value` และ `funded_amount` ในแถวเดิม |
| เลือก Account ใหม่ให้สินทรัพย์ที่เชื่อมแล้ว | ไม่อนุญาต ต้องใช้ Account ต้นทางเดิม |
| ลบ Investment ที่เชื่อมบัญชี | คืน `funded_amount` เข้าบัญชีเดิมก่อนลบ |
| แก้หรือลบ Investment เก่าที่ J–K ว่าง | ไม่ปรับยอด Account ย้อนหลัง |

Investment ไม่ถูกนับเป็น Expense และไม่รวมใน Cash Flow หรือกราฟสัดส่วนรายจ่าย เพราะเป็นการเปลี่ยนรูปสินทรัพย์ ไม่ใช่การใช้จ่ายสูญเสียมูลค่า

## การทดสอบหลัง Deploy

ใช้ยอดเล็กก่อน เช่น 1 บาท

1. จดยอด Account ก่อนทดสอบ
2. เลือก Investment เดิมหรือเพิ่มชื่อใหม่ เลือก Account และระบุยอดเงินรอบนี้ 1 บาท
3. ตรวจว่า Account ลดลง 1 บาท และ `current_value`/`funded_amount` เพิ่ม 1 บาท
4. เติมเงินใน Investment เดิมอีก 1 บาท ตรวจว่าเพิ่มในแถวเดิมและ Account ลดอีก 1 บาทเท่านั้น
5. ลบ Investment ทดสอบ ตรวจว่า Account คืนตาม `funded_amount` ทั้งหมด
6. ตรวจว่า Cash Flow และกราฟรายจ่ายไม่รวมเงินลงทุนนี้

## ข้อจำกัด

- ฟังก์ชันนี้รวม Contribution ใน Investment หนึ่งแถวและหนึ่ง Account ต้นทาง ไม่ใช่สมุดซื้อ–ขายหลักทรัพย์เต็มรูปแบบ
- ยังไม่มีการขาย การรับปันผล ค่าธรรมเนียม ภาษี หรือประวัติซื้อหลายครั้งแบบ Investment Ledger
- การย้อน Code ไม่ย้อนยอด Account ที่ v2.3.0+ เขียนไปแล้ว ต้อง Reconcile กับข้อมูลจริงเสมอ
- Google Sheets API ไม่มี Transaction แบบฐานข้อมูลข้ามชีต หากเกิดข้อความว่า Rollback ไม่สำเร็จ ให้หยุดบันทึกและตรวจยอด Account กับ Investment ก่อนทำรายการต่อ
