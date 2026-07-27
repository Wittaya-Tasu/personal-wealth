// =========================================
// 1. ระบบจดจำหมวดหมู่ที่ใช้บ่อย (Auto-Suggest)
// =========================================
const defaultCategories = ["อาหารและเครื่องดื่ม", "เดินทาง/น้ำมัน", "ช้อปปิ้ง", "บิล/ค่าใช้จ่าย", "เงินเดือน", "รายได้พิเศษ"];

function loadCategories() {
    const savedCategories = JSON.parse(localStorage.getItem('myCategories')) || [];
    const allCategories = [...new Set([...defaultCategories, ...savedCategories])];
    
    const dataList = document.getElementById('categoryList');
    if (dataList) {
        dataList.innerHTML = '';
        allCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            dataList.appendChild(option);
        });
    }
}

function saveNewCategory(newCategory) {
    if (!newCategory || newCategory.trim() === '') return;
    
    let savedCategories = JSON.parse(localStorage.getItem('myCategories')) || [];
    if (!defaultCategories.includes(newCategory) && !savedCategories.includes(newCategory)) {
        savedCategories.push(newCategory);
        localStorage.setItem('myCategories', JSON.stringify(savedCategories));
        loadCategories();
    }
}

// =========================================
// 2. การตั้งค่าระบบ Login และ Google APIs
// =========================================
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';

let tokenClient;
let gapiInited = false;
let gisInited = false;

function gapiLoaded() { gapi.load('client', initializeGapiClient); }

async function initializeGapiClient() {
    await gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: APP_CONFIG.GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: '', 
    });
    gisInited = true;
    maybeEnableButtons();
}

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

function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) throw (resp);
        document.getElementById('authorize_button').style.display = 'none';
        document.getElementById('signout_button').style.display = 'block';
        console.log("เข้าสู่ระบบสำเร็จ!");
    };
    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

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

// =========================================
// 3. ฟังก์ชันเปิด/ปิด Bottom Sheet
// =========================================
function closeSheet() {
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('bottomSheet').classList.remove('active');
}

function openForm(formId) {
    document.getElementById('typeSelection').style.display = 'none';
    document.querySelectorAll('.form-container').forEach(f => f.style.display = 'none');
    document.getElementById(formId).style.display = 'block';
}

function resetSheet() {
    document.getElementById('typeSelection').style.display = 'block';
    document.querySelectorAll('.form-container').forEach(f => f.style.display = 'none');
}

// =========================================
// 4. การจัดการตอนหน้าเว็บโหลดเสร็จ
// =========================================
document.addEventListener("DOMContentLoaded", () => {
    console.log("App UI Loaded Successfully");
    loadCategories(); // โหลด Auto-suggest

    // ผูก Event ให้ปุ่ม + เปิดหน้าต่าง
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            document.getElementById('overlay').classList.add('active');
            document.getElementById('bottomSheet').classList.add('active');
            resetSheet();
        });
    }

    // ผูก Event ปิดหน้าต่างตอนคลิกพื้นหลัง
    const overlay = document.getElementById('overlay');
    if (overlay) overlay.addEventListener('click', closeSheet);

    // ผูก Event ปุ่ม Login
    const authBtn = document.getElementById('authorize_button');
    const signoutBtn = document.getElementById('signout_button');
    if(authBtn) authBtn.addEventListener('click', handleAuthClick);
    if(signoutBtn) signoutBtn.addEventListener('click', handleSignoutClick);

    // ตรวจสอบ Google Libs
    const checkGoogleLibs = setInterval(() => {
        if (window.gapi && window.google) {
            clearInterval(checkGoogleLibs);
            gapiLoaded();
            gisLoaded();
        }
    }, 100);
});

// =========================================
// 5. ส่งข้อมูลไปยัง Google Apps Script
// =========================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwhRPVepM0SaTd-lW7DtMf_Qha_0l6B8DW6GnJWet45R8A85J3srki_fOs3mX-K2576/exec"; 

window.submitData = async function(event, sheetName) {
    event.preventDefault(); 
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "กำลังบันทึกข้อมูล...";
    submitBtn.disabled = true;

    const formData = new FormData(event.target);
    const dataObj = Object.fromEntries(formData.entries());

    if (dataObj.category) saveNewCategory(dataObj.category);
    
    const payload = {
        sheet: sheetName,
        data: dataObj
    };

    try {
        const response = await fetch(WEB_APP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (result.status === "success") {
            alert("✅ บันทึกข้อมูลสำเร็จ!");
            closeSheet();
            event.target.reset();
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
