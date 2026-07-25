document.addEventListener("DOMContentLoaded", () => {
    console.log("App UI Loaded Successfully");

    if (typeof APP_CONFIG !== "undefined") {
        console.log("Configuration Loaded");
    }

    const addBtn = document.getElementById("addBtn");

    if (addBtn) {
        addBtn.addEventListener("click", () => {
            alert("ระบบเปิดหน้าต่าง Bottom Sheet สำหรับเพิ่มรายการใหม่");
        });
    }
});
