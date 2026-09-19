# Migration ระบบบัตรเครดิต — v2.5.0

สำรอง Google Sheet ก่อน แล้วเพิ่ม Header **ต่อท้ายแถวที่ 1 เท่านั้น** ห้ามแทรกคอลัมน์กลางตาราง

## 1. ชีต Transactions

| Cell | Header |
|---|---|
| J1 | `payment_method` |
| K1 | `credit_card` |

คอลัมน์ I ต้องเป็น `item_name` จาก Migration v2.4.0 อยู่แล้ว

## 2. ชีต Liabilities

| Cell | Header |
|---|---|
| F1 | `liability_type` |

สำหรับบัตร KTC ให้สร้างหรือแก้แถวใน Liabilities ตัวอย่าง:

| liability_name | total_amount | monthly_payment | liability_type |
|---|---:|---:|---|
| บัตรเครดิต KTC | 0 | 0 | CreditCard |

`total_amount` คือยอดหนี้บัตรปัจจุบัน หากยังไม่มีหนี้ให้ใส่ 0

## กติกาหลัง Migration

- รูดบัตร: Transaction เป็น `Expense`, `payment_method = CreditCard`, `credit_card = บัตรเครดิต KTC`; ระบบเพิ่ม `Liabilities.total_amount` และนับในกราฟรายจ่ายเดือนที่ซื้อ
- จ่ายบัตร: Transaction เป็น `CreditCardPayment`; ระบบลด Account ต้นทางและยอดหนี้ แต่ไม่ถูกนับเป็นรายจ่ายซ้ำ
- รายการชำระแบบเต็มจำนวนใช้ยอดหนี้ปัจจุบัน ณ เวลากดบันทึก
- ระบบไม่อนุญาตให้ชำระเกินยอดหนี้หรือทำให้ Account ติดลบ
- การลบบัตรลบแถวบัตรและยอดหนี้ออกจาก Liabilities แต่เก็บประวัติ Expense เดิมไว้เพื่อให้กราฟย้อนหลังยังถูกต้อง

## การทดสอบหลัง Deploy

1. สร้างบัตรเครดิต KTC ยอด 0
2. บันทึก Expense 1 บาท เลือกช่องทาง `บัตรเครดิต` และเลือก KTC
3. ตรวจว่า Cash Flow/กราฟรายจ่ายเพิ่ม 1 บาท, Account ไม่ลด และยอดหนี้ KTC เพิ่ม 1 บาท
4. กด `จ่ายบัตร` เลือกบัญชีธนาคารและ `เต็มจำนวน`
5. ตรวจว่า Account ลด 1 บาท, หนี้ KTC กลับเป็น 0 และ Cash Flow ไม่เพิ่มรายจ่ายอีก 1 บาท

หากต้อง Rollback Code ให้หยุดทำรายการก่อน แล้ว Reconcile ทั้ง Accounts และ Liabilities เพราะการย้อน Code ไม่ย้อนยอดที่เขียนลง Google Sheet แล้ว
