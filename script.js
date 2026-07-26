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

    // จัดการปุ่ม + (ดึงมาจากโค้ดเดิม)
    const addBtn = document.getElementById("addBtn");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            alert("ระบบเปิดหน้าต่าง Bottom Sheet สำหรับเพิ่มรายการใหม่");
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
