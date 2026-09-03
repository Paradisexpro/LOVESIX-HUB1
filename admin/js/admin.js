// ==========================================
// การตั้งค่า API URL
// ==========================================
// *** นำ Web App URL ที่ได้จาก Google Apps Script มาใส่ที่นี่ (ต้องเป็น URL เดียวกับใน main.js) ***
const API_URL = 'https://script.google.com/macros/s/AKfycby13G_NMNAHL2gCgRN7-kKQoQeEl32-kUyUnH7p2TIjPe1PWY0mLs2IY24a4kGb2QI/exec';

document.getElementById('add-product-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const statusMsg = document.getElementById('status-message');
    
    if (API_URL === 'https://script.google.com/macros/s/AKfycbzfTnO85of4jC-Puh6SnM6b5gVGxAcOUi7RRxVVt0lN0xNJMG7GfbTXsuI3dEzMdKU/exec') {
        showStatus('error', 'กรุณาตั้งค่า API_URL ในไฟล์ admin.js ก่อนใช้งาน');
        return;
    }

    // เตรียมข้อมูล
    const productData = {
        Name: document.getElementById('name').value,
        Description: document.getElementById('description').value,
        FullPrice: parseFloat(document.getElementById('fullPrice').value) || 0,
        SalePrice: parseFloat(document.getElementById('salePrice').value) || parseFloat(document.getElementById('fullPrice').value),
        ImageUrl: document.getElementById('imageUrl').value,
        SampleLink: document.getElementById('sampleLink').value
    };

    // UI Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังบันทึก...';
    statusMsg.classList.add('hidden');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(productData),
            // ไม่ต้องใส่ headers Content-Type เพราะบางที GAS จะ block CORS preflight
        });

        const result = await response.json();

        if (result.status === 'success') {
            showStatus('success', 'บันทึกสินค้าเรียบร้อยแล้ว!');
            document.getElementById('add-product-form').reset();
        } else {
            showStatus('error', 'เกิดข้อผิดพลาด: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        // หมายเหตุ: การยิง POST ไป GAS จากหน้าเว็บตรงๆ อาจเกิดปัญหา CORS (No-cors) 
        // ถ้าขึ้น error แต่อาจจะบันทึกเข้า sheet ไปแล้ว ให้ลองเช็ค sheet ดู
        showStatus('success', 'ส่งคำสั่งบันทึกแล้ว (กรุณาตรวจสอบใน Google Sheet อีกครั้ง)');
        document.getElementById('add-product-form').reset();
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> บันทึกสินค้า';
    }
});

function showStatus(type, message) {
    const statusMsg = document.getElementById('status-message');
    statusMsg.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');
    
    if (type === 'success') {
        statusMsg.classList.add('bg-green-100', 'text-green-700');
    } else {
        statusMsg.classList.add('bg-red-100', 'text-red-700');
    }
    
    statusMsg.textContent = message;
}
