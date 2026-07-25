# Personal Wealth Dashboard

WebApp สำหรับบันทึกและติดตามความมั่งคั่งส่วนบุคคล ออกแบบสำหรับใช้งานส่วนตัว โดยใช้ GitHub Pages เป็น Frontend และ Google Sheets เป็นฐานข้อมูล

## คุณสมบัติหลัก

- บันทึกรายรับ รายจ่าย การลงทุน และทรัพย์สิน
- แสดง Dashboard สรุปความมั่งคั่งสุทธิ
- เตรียมโครงสร้างสำหรับเชื่อม Private Google Sheets
- รองรับการติดตั้งเป็น PWA บน iPhone และอุปกรณ์มือถือ
- ใช้ UI แบบ Dark Emerald + Gold
- ใช้ฟอนต์ภาษาไทย Sarabun

## เทคโนโลยี

- HTML5
- CSS3
- Vanilla JavaScript
- Google Sheets API
- OAuth 2.0 / Google Login
- GitHub Pages

## โครงสร้างไฟล์

```text
/
├── index.html
├── style.css
├── script.js
├── config.js
├── manifest.json
└── README.md
```

## เปิดทดสอบในเครื่อง

เปิดไฟล์ `index.html` ด้วยเว็บเบราว์เซอร์เพื่อดู UI เบื้องต้นได้ทันที

การเชื่อม Google Login และ Google Sheets จะดำเนินการในขั้นถัดไป

## เผยแพร่ด้วย GitHub Pages

1. สร้าง Repository ใหม่ใน GitHub
2. อัปโหลดไฟล์ทั้ง 6 ไฟล์ไว้ที่ Root ของ Repository
3. ไปที่ `Settings > Pages`
4. เลือก `Deploy from a branch`
5. เลือก Branch `main` และโฟลเดอร์ `/ (root)`
6. กด Save แล้วรอ GitHub สร้างลิงก์เว็บไซต์

## คำเตือนด้านความปลอดภัย

ห้ามนำข้อมูลต่อไปนี้ขึ้น GitHub:

- Client Secret
- รหัสผ่าน
- Access Token หรือ Refresh Token
- ข้อมูลธุรกรรมหรือข้อมูลการเงินจริง
- ไฟล์สำรอง Google Sheets

Google Sheet ต้องตั้งเป็น Private และอนุญาตเฉพาะบัญชี Google ของเจ้าของระบบ
