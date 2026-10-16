# Migration — รายจ่ายประจำ v2.19.0

สร้างชีตใหม่ชื่อ `RecurringExpenses` แล้วใส่ Header แถวที่ 1 ตามลำดับนี้ ห้ามแปลหรือสลับชื่อคอลัมน์

| Cell | Header | ใช้เก็บข้อมูล |
|---|---|---|
| A1 | `recurring_id` | รหัสรายการที่ระบบสร้างให้ |
| B1 | `name` | ชื่อรายจ่ายประจำ |
| C1 | `frequency` | `Monthly` หรือ `Yearly` |
| D1 | `amount` | ยอดประมาณการ |
| E1 | `next_due_date` | วันครบกำหนดครั้งถัดไป รูปแบบ `YYYY-MM-DD` |
| F1 | `expense_category` | หมวดหมู่รายจ่าย |
| G1 | `expense_group` | กลุ่มรายจ่ายระดับบน |
| H1 | `is_essential` | `Yes` หรือ `No` |
| I1 | `payment_method` | `Account` หรือ `CreditCard` |
| J1 | `account_from` | บัญชีต้นทางเมื่อจ่ายจากบัญชี |
| K1 | `credit_card` | ชื่อบัตรเมื่อจ่ายด้วยบัตรเครดิต |
| L1 | `active` | `Yes` หรือ `No` |
| M1 | `note` | หมายเหตุ |
| N1 | `last_paid_date` | วันที่จ่ายจริงครั้งล่าสุด |
| O1 | `created_at` | เวลาสร้างข้อมูล |
| P1 | `updated_at` | เวลาแก้ไขล่าสุด |

## ข้อความสำหรับ Copy ไปวางที่ A1

คัดลอกบรรทัดด้านล่างไปวางที่ `A1` ครั้งเดียว Google Sheets จะแยกเป็น 16 คอลัมน์ให้อัตโนมัติ

```text
recurring_id	name	frequency	amount	next_due_date	expense_category	expense_group	is_essential	payment_method	account_from	credit_card	active	note	last_paid_date	created_at	updated_at
```

ไม่ต้องกรอกแถวที่ 2 ล่วงหน้า และไม่ต้องเพิ่ม Header ในชีต `Transactions`

## วิธีทำงานของปุ่ม “จ่ายแล้ว”

1. ปุ่มจะกดได้เมื่อวันครบกำหนดมาถึงหรือเลยกำหนดแล้ว
2. ระบบให้ยืนยันวันที่จ่ายจริง ยอดจริง และช่องทางที่จ่าย
3. ระบบสร้าง `Expense` ในชีต `Transactions`
4. จ่ายจากบัญชีจะหัก `Accounts.balance`; จ่ายด้วยบัตรเครดิตจะเพิ่ม `Liabilities.total_amount`
5. ระบบบันทึก `last_paid_date` และเลื่อน `next_due_date` ไปเดือนหรือปีถัดไป
6. แต่ละรอบใช้ `tx_id` แบบกำหนดแน่นอนเพื่อป้องกันการกดบันทึกรอบเดิมซ้ำ

ระบบนี้ไม่สร้างรายการเองขณะปิด WebApp และไม่ใช่ระบบตัดเงินอัตโนมัติ ผู้ใช้ต้องเปิดแอปและกด `จ่ายแล้ว` หลังจ่ายเงินจริง
