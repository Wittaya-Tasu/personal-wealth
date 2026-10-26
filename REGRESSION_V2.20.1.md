# Regression — TasuyaWay v2.20.1

## ผลตรวจในเครื่อง

| รายการ | ผล |
|---|---|
| JavaScript syntax: api.js, app.js, analytics.js, helpers, report.js, sw.js | ผ่าน |
| เพิ่มเงินใน Investment เดิมจาก Account คนละบัญชี | ผ่าน Mock |
| หักเฉพาะ Account ที่เลือกในรอบใหม่ | ผ่าน Mock |
| รวม principal_amount และ funded_amount ในแถวเดิม | ผ่าน Mock |
| เก็บ funding_by_account แบบไม่ซ้ำตัวพิมพ์เล็ก–ใหญ่ | ผ่าน Mock |
| ลบ Investment แล้วคืนยอดเข้าหลาย Account | ผ่าน Mock |
| อ่านข้อมูลเดิมจาก account_from + funded_amount เมื่อ ledger ว่าง | ผ่าน Mock |
| ป้องกัน Rename/Delete Account ทุกบัญชีที่ถูกอ้างถึง | ผ่าน Mock |
| Dropdown บัญชีไม่ถูก disabled เมื่อเลือกสินทรัพย์เดิม | ผ่าน Static check |
| Asset URL และ Service Worker cache เป็น 2.20.1 | ผ่าน Static check |

## ต้องทดสอบหลัง Deploy

- Google Sheets API จริงกับ Header `funding_by_account`
- Safari/PWA บน iPhone
- การ Refresh หลัง Service Worker เปลี่ยนรุ่น
- ยอดเงินจริงควรทดสอบด้วยสินทรัพย์และ Account ทดสอบจำนวน 1 บาท

ไม่มีการเขียนข้อมูลทดสอบลง Google Sheet จริงในขั้นตอนตรวจนี้
