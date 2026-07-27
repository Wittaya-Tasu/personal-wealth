// =========================================
// ระบบจดจำหมวดหมู่ที่ใช้บ่อย (Auto-Suggest)
// =========================================

// 1. กำหนดหมวดหมู่พื้นฐาน (Default)
const defaultCategories = ["อาหารและเครื่องดื่ม", "เดินทาง/น้ำมัน", "ช้อปปิ้ง", "บิล/ค่าใช้จ่าย", "เงินเดือน", "รายได้พิเศษ"];

// 2. โหลดหมวดหมู่ผสมกันระหว่าง Default และที่เคยพิมพ์ไว้
function loadCategories() {
    const savedCategories = JSON.parse(localStorage.getItem('myCategories')) || [];
    // รวมหมวดหมู่พื้นฐานกับที่เซฟไว้ และตัดตัวซ้ำออก
    const allCategories = [...new Set([...defaultCategories, ...savedCategories])];
    
    const dataList = document.getElementById('categoryList');
    if (dataList) {
        dataList.innerHTML = ''; // ล้างของเก่า
        allCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            dataList.appendChild(option);
        });
    }
}

// 3. ฟังก์ชันบันทึกหมวดหมู่ใหม่ลง LocalStorage
function saveNewCategory(newCategory) {
    if (!newCategory || newCategory.trim() === '') return;
    
    let savedCategories = JSON.parse(localStorage.getItem('myCategories')) || [];
    
    // ถ้ายังไม่มีคำนี้ในระบบ ให้บันทึกเพิ่มเข้าไป
    if (!defaultCategories.includes(newCategory) && !savedCategories.includes(newCategory)) {
        savedCategories.push(newCategory);
        localStorage.setItem('myCategories', JSON.stringify(savedCategories));
        loadCategories(); // อัปเดตลิสต์ทันที
    }
}

// เรียกใช้งานตอนโหลดหน้าเว็บ
document.addEventListener('DOMContentLoaded', loadCategories);

// กำหนด Scope สำหรับการอ่าน/เขียน Google Sheets
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// ฟังก์ชันเริ่มต้น Google API Client
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

// ฟังก์ชันเริ่มต้น Google Identity Services (ระบบล็อกอิน)
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: APP_CONFIG.GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '', // จะถูกกำหนดเมื่อผู้ใช้กดปุ่ม
    });
    gisInited = true;
    maybeEnableButtons();
}

// ฟังก์ชันตรวจสอบและแสดงปุ่มที่เหมาะสม
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        const token = gapi.client.getToken();
        if (token === null) {
            document.getElementById('authorize_button').style.display = 'block';
            document.getElementById('signout_button').style.display = 'none';
        } else {
            document.getElementById('authorize_button').style.display = 'none';
            document.getElementById('signout_button').style.display = 'block';
        }
    }
}

// เมื่อกดปุ่ม "ล็อกอินด้วย Google"
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        document.getElementById('authorize_button').style.display = 'none';
        document.getElementById('signout_button').style.display = 'block';
        console.log("เข้าสู่ระบบสำเร็จ!");
    };

    if (gapi.client.getToken() === null) {
        // ให้ผู้ใช้กดยืนยันสิทธิ์
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        // ขอ Token ใหม่โดยไม่ต้องกดซ้ำ
        tokenClient.requestAccessToken({prompt: ''});
    }
}

// เมื่อกดปุ่ม "ออกจากระบบ"
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken('');
            document.getElementById('authorize_button').style.display = 'block';
            document.getElementById('signout_button').style.display = 'none';
            console.log("ออกจากระบบแล้ว");
        });
    }
}

// ทำงานเมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener("DOMContentLoaded", () => {
    console.log("App UI Loaded Successfully");

    if (typeof APP_CONFIG !== "undefined") {
        console.log("Configuration Loaded:", APP_CONFIG.SPREADSHEET_ID ? "Yes" : "No");
    }

 // อ้างอิง Elements ใหม่
const addBtn = document.getElementById('addBtn');
const overlay = document.getElementById('overlay');
const bottomSheet = document.getElementById('bottomSheet');

// อันนี้คือโค้ดที่ถูกต้องสำหรับเปิด Bottom Sheet 
// (ถ้ามีโค้ดเก่าที่สั่ง alert ให้ลบทิ้งแล้วใช้ตัวนี้แทนครับ)
if (addBtn) {
    addBtn.addEventListener('click', () => {
        overlay.classList.add('active');
        bottomSheet.classList.add('active');
        resetSheet(); 
    });
}

    // ผูก Event ให้ปุ่มล็อกอินและออกจากระบบ
    document.getElementById('authorize_button').addEventListener('click', handleAuthClick);
    document.getElementById('signout_button').addEventListener('click', handleSignoutClick);

    // รอให้สคริปต์ของ Google โหลดเสร็จแล้วจึง Initialize
    const checkGoogleLibs = setInterval(() => {
        if (window.gapi && window.google) {
            clearInterval(checkGoogleLibs);
            gapiLoaded();
            gisLoaded();
        }
    }, 100);
});
// =========================================
// ส่วนการทำงานของฟอร์มเพิ่มข้อมูล (Bottom Sheet)
// =========================================

// 1. นำ URL ที่ได้จากการ Deploy Google Apps Script มาใส่ตรงนี้
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxGMz28UgS1EclYWA4C7vj65k6AD0fKLbqY9X53a5Kz_Hw1Lo4opIKh58hvH4qFNUzR/exec"; 

// 2. อ้างอิง Elements ต่างๆ
const addBtn = document.getElementById('addBtn'); // ปุ่ม + ตรงกลางล่าง
const overlay = document.getElementById('overlay');
const bottomSheet = document.getElementById('bottomSheet');
const typeSelection = document.getElementById('typeSelection');
const forms = document.querySelectorAll('.form-container');

// 3. ฟังก์ชันเปิด/ปิด หน้าต่าง
if (addBtn) {
    addBtn.addEventListener('click', () => {
        overlay.classList.add('active');
        bottomSheet.classList.add('active');
        resetSheet(); // ให้เริ่มที่หน้าเลือกประเภทเสมอ
    });
}

function closeSheet() {
    overlay.classList.remove('active');
    bottomSheet.classList.remove('active');
}

if (overlay) {
    overlay.addEventListener('click', closeSheet); // คลิกพื้นหลังเพื่อปิด
}

// 4. ฟังก์ชันเปลี่ยนหน้าภายในฟอร์ม
function openForm(formId) {
    typeSelection.style.display = 'none';
    forms.forEach(f => f.style.display = 'none');
    document.getElementById(formId).style.display = 'block';
}

function resetSheet() {
    typeSelection.style.display = 'block';
    forms.forEach(f => f.style.display = 'none');
}

// 5. ฟังก์ชันส่งข้อมูลไปยัง Google Apps Script
window.submitData = async function(event, sheetName) {
    event.preventDefault(); // หยุดการรีเฟรชหน้า
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "กำลังบันทึกข้อมูล...";
    submitBtn.disabled = true;

    const formData = new FormData(event.target);
    const dataObj = Object.fromEntries(formData.entries());

// ==========================================
    // [เพิ่มตรงนี้] บันทึกหมวดหมู่ใหม่ลง LocalStorage
    if (dataObj.category) {
        saveNewCategory(dataObj.category);
    }
    // ==========================================
    
    const payload = {
        sheet: sheetName,
        data: dataObj
    };

    try {
        // ในไฟล์ script.js ตรงฟังก์ชัน submitData
        const response = await fetch(WEB_APP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8", // เพิ่มบรรทัดนี้เพื่อแก้ปัญหา CORS
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (result.status === "success") {
            alert("✅ บันทึกข้อมูลสำเร็จ!");
            closeSheet();
            event.target.reset(); // ล้างฟอร์ม
        } else {
            alert("❌ เกิดข้อผิดพลาด: " + result.message);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
};
