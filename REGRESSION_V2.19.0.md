# ผลตรวจ v2.19.0 — รายจ่ายประจำ

| การทดสอบ | ผล |
|---|---|
| JavaScript syntax | ผ่าน |
| รอบ Monthly / Yearly / ข้ามปี / สิ้นเดือน | ผ่าน Mock |
| สถานะ ยังไม่ถึงกำหนด / วันนี้ / เลยกำหนด / พัก | ผ่าน Mock |
| บันทึก Expense ด้วยบัญชี | ผ่าน Mock |
| บันทึก Expense ด้วยบัตรเครดิต | ผ่าน Mock |
| ป้องกันการจ่ายก่อนกำหนดและรอบเดิมซ้ำ | ผ่าน Mock |
| เลื่อน `next_due_date` และเขียน `last_paid_date` | ผ่าน Mock |
| Rollback Transaction หากเลื่อนรอบถัดไปเขียนไม่สำเร็จ | ผ่าน Mock |
| ป้องกัน Rename/Delete บัญชีหรือบัตรที่ถูกอ้างอิง | ผ่าน Mock |
| Responsive layout มือถือ/แท็บเล็ต/คอมพิวเตอร์ | ผ่าน Static checks |
| PWA cache และ URL version 2.19.0 | ผ่าน Static checks |
| Google Sheet จริงและ Safari บน iPhone | ต้องทดสอบหลัง Deploy |
