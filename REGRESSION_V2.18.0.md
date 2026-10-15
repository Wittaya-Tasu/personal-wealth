# ผลตรวจ TasuyaWay v2.18.0

วันที่ตรวจ: 15 ตุลาคม 2026 (Asia/Bangkok)

## ฐานที่ใช้

ใช้ `tasuya-way-v2.17.0 (2).zip` ที่ผู้ใช้ระบุ เปรียบเทียบ Git blob SHA ของ index.html, app.js, api.js, habit-tracker.js, analytics.js, report.js, style.css และ sw.js แล้วตรงกับ source บน GitHub main ณ SHA `e79bc4f4d65e155170b65ad519876e7f2e83b7a5`

## ผ่านการตรวจ

| ขอบเขต | ผล |
|---|---|
| Habit engine และ API | 41 checks: 7 วัน/เดือน, Daily/Weekly/Monthly/Yearly/Interval, เป้าต่อรอบ, Streak, วันพัก, วันเริ่ม, Leap year, เปลี่ยนปี, กดทำ/ยกเลิก และป้องกันวันที่อนาคต |
| MonthlyEvents และ Regression | 18 กลุ่ม: ข้อมูลจำเป็น, วันที่จริง, ความยาว, Category/Tone, ID/เวลา, เดือน, เพิ่ม/แก้ไข/ลบผ่าน Sheets request จำลอง, RAW, ID ซ้ำ/ถูกลบ, Header และ config เดิม |
| Habit Responsive | 14 ความกว้าง: 320, 360, 375, 390, 430, 560, 600, 759, 760, 768, 820, 1024, 1280, 1440px ตาราง 7 วันไม่ล้นหน้า |
| MonthlyEvents Responsive | 12 ความกว้าง: 320, 360, 390, 430, 560, 759, 760, 768, 820, 1024, 1280, 1440px ไม่ล้นหน้า/ช่องกรอก จอเล็ก 1 คอลัมน์ จอใหญ่ 2 คอลัมน์ |
| Events UI | เพิ่ม/แก้ทุกฟิลด์/ย้ายเดือนและประเภท/ยืนยันและยกเลิกลบ, เดือนว่าง, เปลี่ยนปี, เดือนนี้, ข้อความหลายบรรทัดและ HTML แสดงเป็นข้อความ |
| Failure UI | เพิ่มล้มเหลวเก็บร่าง, ยกเลิกเปลี่ยนเดือนเก็บร่าง, บันทึกสำเร็จแต่ซิงก์ล้มเหลวบล็อกเขียนซ้ำจนกดซิงก์, Header หายบล็อกเฉพาะ Events และกลับมาใช้ได้หลังซิงก์ |
| Navigation | เปิดครบ 5 เมนูหลักและ 4 แท็บวันนี้ ไม่มี uncaught browser errors ในการทดสอบ |
| Source regression | API method เดิมทุกตัวตรงกับฐาน ยกเว้น loadAll และ rowInputOption ที่เพิ่ม Events; handler เดิมของ app ที่ไม่เกี่ยวข้องตรงกับฐาน |
| ไฟล์หลักเดิม | analytics.js, habit-tracker.js, report.js และ MONTH_END_SNAPSHOT.gs ไม่เปลี่ยนแม้แต่ไบต์เดียว |
| PWA/แพ็กเกจ | ตรวจ JavaScript syntax, static references, cache version 2.18.0, monthly-events.js อยู่ใน cache และ ZIP ไม่มี config.js หรือข้อมูลทดสอบ |

## ขอบเขตการยืนยัน

ทดสอบ UI ด้วย Chromium บน Windows และข้อมูลสมมติ แสดงภาพหน้าจอขนาด iPhone 16 Plus (430px), iPad (820px) และ Desktop (1440px) การจำลองขนาดจอไม่ได้แทนการทดสอบ Safari หรืออุปกรณ์จริง

ยังไม่ได้เข้าสู่ระบบ Google หรือเขียน/ลบข้อมูลใน Google Sheet จริง การทดสอบ API ใช้ request จำลอง จึงยังต้องตรวจ OAuth และข้อมูลจริงหลัง Deploy

เว็บเดิม `https://wittaya-tasu.github.io/personal-wealth/` เปิดถึงหน้า TasuyaWay ได้ในเบราว์เซอร์ โดยแสดงสถานะยังไม่ได้เชื่อมต่อ Google Sheet งาน [pages build and deployment เดิม](https://github.com/Wittaya-Tasu/personal-wealth/actions/runs/38148690942) มีผล success

ยังไม่ Deploy v2.18.0 ไม่มีการ Commit หรือ Push GitHub ตามข้อห้ามของผู้ใช้
