const SHEET_NAME = 'Products';

// ฟังก์ชันนี้รันแค่ครั้งแรกเพื่อสร้างโครงสร้างตาราง
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['ID', 'Name', 'Description', 'ImageUrl', 'SampleLink', 'FullPrice', 'SalePrice', 'Status', 'CreatedAt']);
    // จัดรูปแบบหัวตาราง
    sheet.getRange("A1:I1").setFontWeight("bold").setBackground("#d9d9d9");
    sheet.setFrozenRows(1);
  }
}

// รับคำสั่ง GET สำหรับดึงข้อมูลสินค้าไปแสดงหน้าเว็บ
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  
  // ถ้าไม่มี Sheet ให้คืนค่าว่าง
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({status: 'success', data: []}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = sheet.getDataRange().getValues();
  var products = [];
  
  if (data.length > 1) {
    var headers = data[0];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var product = {};
      for (var j = 0; j < headers.length; j++) {
        product[headers[j]] = row[j];
      }
      
      // ดึงเฉพาะสินค้าที่ Active
      if(product.Status !== 'Inactive') {
         products.push(product);
      }
    }
  }

  // อนุญาต CORS ให้หน้าเว็บเรียกใช้ได้
  return ContentService.createTextOutput(JSON.stringify({status: 'success', data: products}))
    .setMimeType(ContentService.MimeType.JSON);
}

// รับคำสั่ง POST สำหรับเพิ่มข้อมูลจากหน้า Admin
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      setup(); // สร้าง sheet ถ้าย้อนกลับมาแล้วยังไม่มี
      sheet = ss.getSheetByName(SHEET_NAME);
    }
    
    // Parse ข้อมูลที่ส่งมาจาก Admin
    var body = JSON.parse(e.postData.contents);

    var id = Utilities.getUuid();
    var timestamp = new Date();

    sheet.appendRow([
      id,
      body.Name || '',
      body.Description || '',
      body.ImageUrl || '',
      body.SampleLink || '',
      body.FullPrice || 0,
      body.SalePrice || 0,
      'Active',
      timestamp
    ]);

    return ContentService.createTextOutput(JSON.stringify({status: 'success', message: 'Product added successfully'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
