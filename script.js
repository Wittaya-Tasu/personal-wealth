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
            loadDashboardData(); // <--- เพิ่มบรรทัดนี้ เพื่อให้อัปเดตยอดเงินทันที!
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

// =========================================
// 6. ระบบกราฟแท่ง (Chart.js)
// =========================================
let wealthChartInstance = null;

function renderWealthChart(period = 'monthly') {
    const ctx = document.getElementById('wealthChart');
    if (!ctx) return;

    // ข้อมูลจำลอง (Mock Data) สำหรับดูความสวยงามก่อน
    const dataMonthly = {
        labels: ['ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.'],
        data: [3800000, 3950000, 4010000, 4150000, 4218200, 4286450]
    };
    
    const dataYearly = {
        labels: ['2565', '2566', '2567', '2568', '2569'],
        data: [1500000, 2200000, 2900000, 3500000, 4286450]
    };

    const currentData = period === 'monthly' ? dataMonthly : dataYearly;

    // ถ้ามีกราฟเก่าอยู่แล้วให้ทำลายทิ้งก่อนวาดใหม่
    if (wealthChartInstance) {
        wealthChartInstance.destroy();
    }

    wealthChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: currentData.labels,
            datasets: [{
                label: 'ความมั่งคั่งสุทธิ (บาท)',
                data: currentData.data,
                backgroundColor: '#1fca74', // สีเขียวตรงตาม Mockup
                borderRadius: 6, // ทำขอบแท่งให้โค้งมน
                barThickness: 'flex',
                maxBarThickness: 30
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // ซ่อนป้ายกำกับด้านบน
                tooltip: {
                    backgroundColor: '#16201b',
                    titleColor: '#84938a',
                    bodyColor: '#e5c158', // สีทอง
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            // จัดฟอร์แมตตัวเลขให้มีลูกน้ำ (Comma)
                            return ' ฿' + context.raw.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: '#84938a', font: { family: 'Sarabun' } }
                },
                y: {
                    display: false, // ซ่อนตัวเลขแกน Y เพื่อให้ดูสะอาดตา
                    grid: { display: false }
                }
            }
        }
    });
}

// ผูก Event ให้ดรอปดาวน์เปลี่ยนกราฟ และวาดกราฟทันทีที่โหลดหน้าเสร็จ
document.addEventListener("DOMContentLoaded", () => {
    // ... (โค้ดโหลดหน้าเดิม) ...
    
    setTimeout(() => {
        renderWealthChart('monthly');
    }, 500); // ดีเลย์เล็กน้อยรอให้ UI โหลดเสร็จ

    const chartPeriodSelect = document.getElementById('chartPeriod');
    if (chartPeriodSelect) {
        chartPeriodSelect.addEventListener('change', (e) => {
            renderWealthChart(e.target.value);
        });
    }
});

// =========================================
// 7. ระบบดึงข้อมูลจากฐานข้อมูลมาแสดงผล
// =========================================

// ตั้งค่างบประมาณรายเดือนของคุณที่นี่ (เช่น 30000)
const MONTHLY_BUDGET = 30000; 

async function loadDashboardData() {
    try {
        // ให้หน้าจอแสดงว่ากำลังโหลดระหว่างรอข้อมูล
        document.getElementById('displayNetWorth').innerText = "กำลังโหลด...";

        // ดึงข้อมูลผ่าน Web App URL เดิมที่เราใช้ส่งข้อมูล
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();

        // 1. คำนวณยอดการลงทุน (Investments)
        let totalInvestments = 0;
        data.investments.forEach(item => {
            totalInvestments += Number(item.current_value || 0);
        });

        // 2. คำนวณยอดทรัพย์สินอื่นๆ (Assets)
        let totalAssets = 0;
        data.assets.forEach(item => {
            totalAssets += Number(item.estimated_value || item.purchase_price || 0);
        });

        // 3. คำนวณงบประมาณรายเดือน จากตาราง Transactions
        const today = new Date();
        const currentMonth = today.getMonth(); // 0-11
        const currentYear = today.getFullYear();
        
        let currentMonthExpenses = 0;

        data.transactions.forEach(tx => {
            const txDate = new Date(tx.date);
            // เช็คว่าเป็นรายการของเดือนนี้และปีนี้ไหม
            if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
                if (tx.type === 'Expense') {
                    currentMonthExpenses += Number(tx.amount || 0);
                }
            }
        });

        // 4. สรุปตัวเลข
        const netWorth = totalInvestments + totalAssets; // ความมั่งคั่งสุทธิ
        const remainingBudget = MONTHLY_BUDGET - currentMonthExpenses; // งบใช้จ่ายคงเหลือ

        // 5. นำตัวเลขไปแสดงบนหน้า HTML
        document.getElementById('displayNetWorth').innerText = `฿${netWorth.toLocaleString()}`;
        document.getElementById('displayInvestments').innerText = `฿${totalInvestments.toLocaleString()}`;
        document.getElementById('displayRemainingBudget').innerText = `฿${remainingBudget.toLocaleString()}`;
        document.getElementById('displayExpense').innerText = `฿${currentMonthExpenses.toLocaleString()}`;
        
        // จัดสีตัวอักษรของงบคงเหลือ (ถ้าเหลือน้อยกว่า 0 ให้เป็นสีแดง)
        const budgetElem = document.getElementById('displayRemainingBudget');
        if (remainingBudget < 0) {
            budgetElem.style.color = '#ef4444'; // สีแดง
            budgetElem.classList.remove('positive');
        } else {
            budgetElem.style.color = '#1fca74'; // สีเขียว
            budgetElem.classList.add('positive');
        }

    } catch (error) {
        console.error("Error loading data:", error);
        document.getElementById('displayNetWorth').innerText = "โหลดข้อมูลล้มเหลว";
    }
}

// สั่งให้ดึงข้อมูลทันทีที่เว็บโหลดเสร็จ
document.addEventListener("DOMContentLoaded", () => {
    // โค้ดเดิมที่มีอยู่แล้ว ... 
    
    // เรียกฟังก์ชันโหลดข้อมูล
    loadDashboardData();
});
