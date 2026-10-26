# TasuyaWay v2.20.1 — Investment Account Selection Hotfix

ฐาน: GitHub main v2.20.0

## สิ่งที่แก้

- ช่อง `ใช้เงินจากบัญชี` เลือกได้ทุกครั้งที่เพิ่มเงินลงทุน
- สินทรัพย์เดิม เช่น RMF สามารถรับเงินจาก Account คนละบัญชีกับครั้งก่อนได้
- เงินลงทุนยังรวมในแถวสินทรัพย์เดิมและไม่ถูกนับเป็น Expense หรือ Cash Flow
- ระบบเก็บยอดที่เคยหักแยกตามบัญชีใน `funding_by_account`
- เมื่อลบ Investment ระบบคืนเฉพาะยอดที่แอปเคยหักกลับเข้าบัญชีต้นทางแต่ละแห่ง
- Account ทุกบัญชีที่ถูกอ้างถึงยังได้รับการป้องกัน Rename/Delete

## ก่อน Deploy

1. สำรอง Google Sheet และ Repository
2. เปิดชีต `Investments`
3. เพิ่ม Header `funding_by_account` ต่อท้าย Header สุดท้าย โดยโครงสร้างมาตรฐานคือ U1
4. ไม่ต้องกรอกข้อมูลในแถวเก่า และไม่ต้องแก้ `config.js` หรือ Apps Script
5. อัปโหลดไฟล์รุ่น v2.20.1 ทั้งชุดทับไฟล์เดิม
6. รอ GitHub Pages แล้วปิด PWA/หน้าเว็บเดิม เปิดใหม่ และกด Refresh

## การทดสอบหลัง Deploy

1. จดยอด Account A และ Account B
2. เพิ่มเงิน 1 บาทใน Investment เดิม โดยเลือก Account A
3. ตรวจว่า Account A ลด 1 บาท และเงินต้น Investment เพิ่ม 1 บาท
4. เพิ่มอีก 1 บาทใน Investment เดิม โดยเลือก Account B
5. ตรวจว่า Account B ลด 1 บาท โดย Account A ไม่ถูกหักซ้ำ
6. ตรวจว่า Dropdown ยังเปิดให้เลือกได้ และข้อความใต้สินทรัพย์แสดงชื่อบัญชีที่เคยใช้
7. หากเป็นรายการทดสอบ ให้ลบ Investment ทดสอบและตรวจว่ายอด 1 บาทคืนเข้า Account A และ Account B

การลบ Investment จริงจะลบทั้งแถวสินทรัพย์และคืนยอดที่ระบบเคยหักทั้งหมด จึงไม่ควรใช้กับสินทรัพย์จริงเพียงเพื่อทดสอบ ควรสร้างสินทรัพย์ชื่อ `ทดสอบ v2.20.1` แยกต่างหาก

## ไฟล์ที่เปลี่ยน

- `app.js`
- `api.js`
- `index.html`
- `sw.js`
- `README.md`
- `PROJECT_STATE.md`
- `CHANGELOG.md`
- `INVESTMENTS_MIGRATION.md`
- `UPDATE_V2.20.1.md`
- `REGRESSION_V2.20.1.md`
