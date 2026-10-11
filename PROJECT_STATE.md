# TasuyaWay v2.17.0 — สถานะล่าสุด

ฐาน: v2.16.0 ซึ่งผู้ใช้ยืนยันว่าทดสอบระบบแล้วทำงานดี

เพิ่มความถี่ Interval สำหรับวันเว้นวัน/ทุก 2 วัน/ทุก 3 วัน/ทุก N วัน พร้อมวันเริ่มรอบคงที่

Migration: เพิ่ม Habits.interval_days ที่ H1 และ start_date ที่ I1; คอลัมน์ใหม่ว่างใน Habit เดิมได้ ความถี่เดิมไม่ถูกบล็อกเมื่อ H:I ยังไม่ครบ

- วันพักเป็น — และบันทึกเพิ่มไม่ได้ วันที่ถึงกำหนดที่ผ่านมาและยังไม่ทำเป็น × วันนี้ถึงกำหนดเป็น ○
- ตารางข้ามเดือน/ปีได้ ไม่เลื่อนรอบตามวันที่ทำหรือพลาด
- Streak ใช้หน่วยรอบ วันพักไม่ตัด Streak; ความคืบหน้าและสรุปวันนี้นับเฉพาะวันถึงกำหนด
- วันเริ่มเขียนเป็น RAW ISO text เพื่อไม่ขึ้นกับรูปแบบวันที่ของ Google Sheet

| การตรวจ | ผล |
|---|---|
| สูตร/API เดิม + ทุก N วัน + ขอบเขตวัน/เดือน/ปี/ปีอธิกสุรทิน | ผ่าน 41 checks |
| ตาราง 7 วัน ความกว้าง 320–1440 px | ผ่าน 14 ขนาดจอ |
| ฟอร์ม Interval ความกว้าง 320/375/390/600/768/820/1024/1440 px | ผ่าน 8 ขนาดจอ |
| เพิ่มทุก 2/3 วัน บันทึก/ยกเลิกเฉพาะวันถึงกำหนด API ปฏิเสธวันพัก | ผ่าน Browser/Mock |
| Habit เดิมเมื่อไม่มี H:I และการป้องกัน Migration ใหม่ | ผ่าน |
| JavaScript error ที่ไม่ถูกจัดการ | ไม่พบ |
| ภาพจริง Desktop / iPad / iPhone | ตรวจด้วยสายตาแล้ว |
| สูตรการเงิน รายงาน Snapshot และ Apps Script | ไม่เปลี่ยน |
| Google Sheet จริง / Safari บน iPhone จริง | ยังไม่ทดสอบในรุ่นนี้ ต้องยืนยันหลัง Deploy |

ส่งมอบเป็น ZIP ไม่มี config.js, ข้อมูลจริง หรือ QA fixtures ไม่มี Commit/Push/Deploy และไม่มีการเขียนชีตจริง

อ่าน HABIT_INTERVAL_MIGRATION.md สำหรับการเปลี่ยน Habit เดิมผ่านชีต การเปลี่ยนวันเริ่ม/ระยะห่างมีผลต่อการประเมินย้อนหลัง

## สถานะฐาน v2.16.0

# TasuyaWay v2.16.0 — สถานะล่าสุด

ฐาน: ZIP v2.15.1 ที่ผู้ใช้ส่งมา วันที่ 11 ตุลาคม 2026

เพิ่ม Habit Tracker ตามขอบเขตจากแชทเดิม: ตาราง 7 วัน, โหมดเดือน, สถานะเขียว/แดง/ทอง/เทา, เป้าหมายหลายครั้งต่อรอบ, สรุปวันที่เลือกและ Streak

Migration: Habits!G1 = target_count; HabitLogs ใช้ schema เดิม แต่หนึ่งรอบมีหลาย completed_date ได้

| การตรวจ | ผล |
|---|---|
| สูตร Habit / API / ข้อมูลเก่า / เป้าหมาย / ปีใหม่ ISO / ปีอธิกสุรทิน | ผ่าน 23 checks |
| Layout ความกว้าง 320–1440 พิกเซล รวม 14 ขนาด | ผ่าน browser measurement |
| เพิ่ม Weekly เป้า 3, กดบันทึก/ยกเลิกแยกวัน และกู้สถานะเมื่อบันทึกล้มเหลว | ผ่าน browser + mock store |
| โหมดเดือน จำนวนวันจริง ตรึงชื่อ และ schema guard | ผ่าน browser |
| ภาพจริง Desktop / iPad / iPhone | ตรวจด้วยสายตาแล้ว |
| API ที่ไม่ใช่ Habit เทียบรุ่นฐาน | ไม่เปลี่ยน |
| analytics.js / report.js / MONTH_END_SNAPSHOT.gs | ไม่เปลี่ยน |
| Google Sheet จริง / Safari บน iPhone จริง | ยังไม่ทดสอบ ต้องยืนยันหลัง Deploy |

ไฟล์ส่งมอบไม่รวม config.js, token, ข้อมูลชีตจริง หรือข้อมูลจำลอง QA ไม่มี Commit/Push/Deploy และไม่มีการแก้ Google Sheet ของผู้ใช้

อ่าน HABIT_TRACKER_MIGRATION.md ก่อนอัปโหลด เป้าหมายที่ปรับในแถวเดิมมีผลต่อ Streak ย้อนหลัง และไม่ควรใช้แอปรุ่นเก่ากับชีตที่บันทึกหลายครั้งต่อรอบแล้ว

## สถานะฐาน v2.15.1

# TasuyaWay v2.15.1 — สถานะล่าสุด

ปรับเฉพาะ Layout ของการ์ด Todo บนมือถือให้ checkbox, ดาว, ข้อความ และปุ่มแก้/ลบอยู่แถวเดียว
ลด padding, row gap และ line-height ของรายการรายวัน โปรเจก และงานย่อยในโปรเจก
ไม่มีการเปลี่ยน schema, Google Sheet, Todo carry-forward หรือพฤติกรรมบันทึกข้อมูล
Service Worker และ Static Asset URL เปลี่ยนเป็น 2.15.1 เพื่อบังคับโหลด CSS ใหม่

| การทดสอบ | ผล |
|---|---|
| CSS layout สำหรับ Todo/Project/Project task | ผ่าน Static; ต้องยืนยันภาพจริงบน iPhone |
| JavaScript syntax และ DOM เดิม | ผ่าน |
| Todo carry-forward / Project navigation / Google Sheet schema | ไม่เปลี่ยน |
| Safari บน iPhone หลัง Deploy | ต้องทดสอบจริง |

## สถานะฐาน v2.15.0

# TasuyaWay v2.15.0 — สถานะล่าสุด

เพิ่ม optional sheet BuyWish A:N และหน้า BuyWish ภายใต้เมนูเป้าหมาย
ติดตามยอดจาก Manual หรือ Accounts.balance โดยไม่แก้ยอดบัญชี
หนึ่งบัญชีใช้กับ BuyWish ที่ยังเปิดได้หนึ่งรายการ ป้องกันการนับซ้ำ
Account rename/delete ถูกบล็อกเมื่อ BuyWish อ้างถึง
Purchased ไม่สร้าง Expense และไม่หัก Account อัตโนมัติ
ไม่มีการเปลี่ยนสูตร Wealth, Transaction, Snapshot และ Monthly Report

อ่าน BUY_WISH_MIGRATION.md และ UPDATE_V2.15.0.md ก่อน Deploy

| การทดสอบ | ผล |
|---|---|
| BuyWish schema / Manual / Account / duplicate guard | ผ่าน |
| ฟอร์ม เพิ่ม–แก้ไข / Filter / Priority / Product URL | ผ่าน DOM |
| Account reference protection | ผ่าน |
| Syntax / HTML ID / Versioned assets / Service Worker | ผ่าน |
| Transaction / Credit Card / Investment / Wealth | ผ่าน Regression |
| Monthly Report / Snapshot parity | ผ่าน Regression |
| Google Sheet และ Safari บน iPhone หลัง Deploy | ต้องทดสอบจริง |

## สถานะฐาน v2.14.1

# TasuyaWay v2.14.1 — สถานะล่าสุด

ปรับเฉพาะภาพรายเดือนเป็นแม่แบบถัง 3 มิติจริงจากภาพที่อนุมัติ + SVG ตัวเลข/progress ไม่มีทศนิยมในจำนวนเงิน
assets/monthly-report-background.png ต้อง Deploy ด้วย ไม่มีตัวเลขติดในแม่แบบ
สูตร analytics, api และ MONTH_END_SNAPSHOT.gs เหมือน v2.14.0 ไม่ต้อง Migration เพิ่ม
ข้อมูลเงินในชีตและ Snapshot ไม่ถูกปัด การปัดเกิดเฉพาะภาพ
ภาพดาวน์โหลด 3840×2160 ใช้ background แบบ data URI ป้องกันแม่แบบหลุดระหว่าง rasterize
ไม่มีประวัติ Snapshot ใช้เฉพาะ flow ย้อนหลัง ไม่ยืมยอดสะสมปัจจุบัน และไม่อ้างวันบันทึกสมมติ

| ตรวจ | ผล |
|---|---|
| สูตรรายงาน/ประวัติ/Apps Script parity | ผ่าน Mock |
| บัญชี/หนี้บัตร/เงินต้น/ประกัน/เกษียณ/เงินฉุกเฉิน | ผ่าน Regression |
| หน้าจอและฟอร์มเดิม | ผ่าน DOM |
| ปุ่มดาวน์โหลดจริง Chromium desktop + mobile viewport | ผ่าน ภาพเหมือนกัน 3840×2160 |
| CSP/แม่แบบฝังใน SVG/ยอดเงินไม่มีทศนิยม/JS errors | ผ่าน |
| ตรวจภาพ PNG จริงด้วยสายตาเทียบแบบที่อนุมัติ | ผ่าน |
| Safari บน iPhone / Google Sheet จริงหลัง Deploy | ยังไม่ทดสอบ |

examples/monthly-report-example.png เป็นข้อมูลสมมติ ไม่มีข้อมูลจริงของผู้ใช้ใน ZIP

## สถานะฐาน v2.14.0

# TasuyaWay v2.14.0 — สถานะล่าสุด

เพิ่มแท็บ monthlyReport ใน Wealth, report.js วาด SVG/PNG 16:9, ตารางประกัน
Migration: MonthlySnapshots.report_json (H1 สำหรับโครงเดิม) และแทน MONTH_END_SNAPSHOT.gs ทั้งไฟล์
รายงาน current=Live, historical=report_json ถ้าอ่านได้; ไม่ครบให้เฉพาะ flows และไม่แสดง stocks วันนี้แทน
รายได้จากสินทรัพย์นับตาม Income.category ชุดที่กำหนด ไม่ใช้ income_received สะสม
ไม่วาดการแบ่งเงินเหลือเป็น investment contribution เพราะฐานเดิมไม่มี ledger รายครั้ง
Apps Script รวมสำเนา analytics.js โดยเปลี่ยน scope เป็น PW_REPORT_SCOPE ต้องรักษาสำเนาให้ตรงเมื่อแก้สูตร

| ตรวจ | ผล |
|---|---|
| สูตรรายงาน / Snapshot / ไม่ยืมยอดปัจจุบัน / ข้อมูลขาด | ผ่าน Mock |
| ตารางประกัน / ภาพรายเดือน / ฟอร์มเดิม | ผ่าน DOM |
| สูตรบัญชี/เงินต้น/ประกัน/เกษียณ/เงินฉุกเฉินเดิม | ผ่าน Regression Mock |
| Syntax / ภาพ PNG ที่เรนเดอร์จาก SVG | ผ่าน |
| Google Sheet / Trigger / iPhone ดาวน์โหลดจริง | ยังไม่ทดสอบ |

อ่าน MONTHLY_REPORT_MIGRATION.md สำหรับข้อจำกัดและ Deploy

## สถานะฐาน v2.13.0

# TasuyaWay v2.13.0 — สถานะล่าสุด

เพิ่ม Dropdown รายได้ 15 ประเภทและประเภทจาก Categories เดิม ใช้ Transactions.category เดิม
กราฟรายรับ/รายจ่ายเป็นแท่ง 100% เลือกเดือนเดียวกัน Health+Protection รวมเฉพาะกราฟ ข้อมูลเดิม/งบ/เงินฉุกเฉินไม่เปลี่ยน
Investments แสดงตารางเลื่อนแนวนอนพร้อมปุ่มจัดการเดิมและสัดส่วนเงินต้น 100%

| ตรวจ | ผล |
|---|---|
| Syntax app/analytics/api/sw | ผ่าน |
| ประเภทรายได้เดิมและสลับ Income/Expense/Transfer | ผ่าน DOM |
| FormData ส่ง category เฉพาะช่องที่ใช้งาน | ผ่าน DOM |
| กราฟเลือกเดือน เดือนมีแต่ Income ยอดรวม 100% ข้อมูลว่าง/ไม่จัดกลุ่ม | ผ่าน Mock |
| บัตรเครดิตซื้อจริงนับ ชำระ/โอนไม่นับซ้ำ | ผ่าน Mock |
| ตารางลงทุนและปุ่มจัดการ | ผ่าน DOM |
| เงินต้น/บัญชี/ประกัน/เกษียณ/เงินฉุกเฉิน | ผ่าน Regression Mock |
| Google Sheets จริง/ภาพ iPhone จริง | ยังไม่ได้ทดสอบ |

ไม่มี Commit/Push/Deploy หรือข้อมูลทดสอบในชีตของผู้ใช้
อ่าน UPDATE_V2.13.0.md สำหรับ Deploy ไม่ต้องแก้ Header/Apps Script เพิ่มจาก v2.12.0

## สถานะฐาน v2.12.0

# TasuyaWay v2.12.0 — Lifetime Wealth Planning

รุ่นนี้เพิ่มรายละเอียดหนี้ ประกัน และเกษียณ พร้อมการลงทุนที่เน้นเงินต้นเป็นหลัก

| ฟังก์ชัน | พฤติกรรม |
|---|---|
| หนี้ | ประเภท เงินกู้เริ่มต้น ดอกเบี้ย วันชำระ วันครบกำหนด วงเงินบัตร และทรัพย์สินที่เกี่ยวข้อง |
| ประกัน | กรมธรรม์รายฉบับ เบี้ยรายปี วันจ่ายเบี้ย ผู้เอาประกัน และสถานะ |
| การลงทุน | เงินต้นแยกจากยอดที่เคยหักบัญชี ระยะเวลา วัตถุประสงค์ ประเภทสินทรัพย์จริง |
| ความเสี่ยง | Auto ตามประเภทสินทรัพย์ หรือ Manual 1–7; เป็นค่าประเมินภายในแอป |
| กำไร/ขาดทุน | เปิดผ่านโหมด Market ได้; ค่าเริ่มต้น Principal ไม่ต้องอัปเดตราคา |
| ปันผล/ดอกเบี้ย | ยอดรับจริงสะสมเลือกกรอก ไม่เพิ่ม Account ซ้ำ |
| เกษียณ | เงินตั้งต้นจากสินทรัพย์ที่เลือกเกษียณ เป้าหมายและช่องว่างตามสมมติฐานที่แก้ได้ |

ต้องทำ [WEALTH_LIFETIME_MIGRATION.md](WEALTH_LIFETIME_MIGRATION.md) และอัปเดต MONTH_END_SNAPSHOT.gs ใน Apps Script เดิมก่อน Deploy

ข้อมูลลงทุนเก่าคงยอดเดิมไว้จนผู้ใช้ยืนยันเงินต้น ห้ามนำ funded_amount หรือ current_value มาเดาเป็นเงินต้นทั้งหมด

## สถานะส่งมอบ

ฐานที่ผู้ใช้ยืนยันทดสอบ: v2.11.0
รุ่นใหม่: v2.12.0
Static assets: tasuya-way-shell-v2.12.0

ต้องตรวจ Google Sheets จริงและ iPhone หลัง Deploy การทดสอบจำลองไม่ใช่ผลยืนยันระบบจริง

## ข้อจำกัด

- เงินต้นเก่าต้องให้ผู้ใช้ยืนยัน ไม่มีการเดาให้
- ชำระสินเชื่อทั่วไปยังอัปเดตยอดหนี้เอง ระบบจ่ายบัตรเครดิตคงเดิม
- เงินปันผลเป็นยอดสะสมสำหรับติดตาม หากรับเงินเข้าบัญชีให้บันทึก Income ครั้งเดียว
- แผนเกษียณเป็นสมมติฐานคงที่ ไม่มี Monte Carlo หรือประมาณการบำนาญ/ภาษี
- อสังหาริมทรัพย์ใน Investments และ Assets ไม่ควรลงซ้ำ
- โหมด Principal ทำให้ Net Worth เป็นมูลค่าตามฐานที่เลือก ไม่ใช่ราคาขายปัจจุบัน
- Readiness check ของสองชีตใหม่เป็น Optional การโหลดหน้าเดิมยังทำงานได้

## ผลตรวจสอบก่อนส่งมอบ

| การตรวจ | ผล |
|---|---|
| JavaScript syntax | ผ่าน |
| เงินต้น / เพิ่มเงินลงทุน / คืนเฉพาะเงินที่หักบัญชี | ผ่าน Mock |
| ปรับรายละเอียดไม่เปลี่ยนยอดบัญชี | ผ่าน Mock |
| มูลค่าปัจจุบัน 0 และเปิด/ปิดกำไรขาดทุน | ผ่าน Mock |
| Auto/Manual ความเสี่ยงและแบบฟอร์มใหม่ | ผ่าน DOM จำลอง |
| ประกันหมดอายุ / เป้าหมายเกษียณ | ผ่าน Mock |
| Expense เงินสด/บัตรเครดิตและสูตรเงินฉุกเฉินเดิม | ผ่าน Regression Mock |
| Snapshot ใช้ฐานมูลค่าเดียวกับเว็บ | ผ่าน Apps Script Mock |
| Google Sheets จริง / Apps Script Trigger จริง / ภาพบน iPhone | ยังไม่ได้ทดสอบ |

ไม่มีการ Commit, Push หรือเขียนข้อมูลทดสอบใน Google Sheet ของผู้ใช้
