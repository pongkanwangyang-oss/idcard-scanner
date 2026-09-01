// =====================================================
// Google Apps Script — Code.gs
// สร้าง Google Slides + stamp ลายเซ็น + export PDF
// =====================================================

// ---- CONFIG: เปลี่ยน PARENT_FOLDER_ID เป็น ID ของโฟลเดอร์หลักใน Drive ----
// วิธีหา ID: เปิดโฟลเดอร์ใน Drive แล้วดูใน URL: .../folders/<ID>
var PARENT_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE";

// -------------------------------------------------------
// รับ POST request จาก Web App
// -------------------------------------------------------
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var photoBase64 = data.photo;      // data:image/jpeg;base64,...
    var sigBase64   = data.signature;  // data:image/png;base64,...
    var timestamp   = data.timestamp || new Date().toISOString();

    // สร้างโฟลเดอร์ใหม่
    var folderName = "ID_" + formatTimestamp(timestamp);
    var parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    var newFolder    = parentFolder.createFolder(folderName);

    // บันทึกไฟล์รูปบัตรและลายเซ็นลง Drive (ชั่วคราว)
    var photoBlob = dataURLtoBlob(photoBase64, "photo.jpg");
    var sigBlob   = dataURLtoBlob(sigBase64,   "signature.png");

    var photoFile = newFolder.createFile(photoBlob);
    var sigFile   = newFolder.createFile(sigBlob);

    // สร้าง Google Slides
    var slideResult = createSlideWithSignature(
      newFolder,
      photoFile,
      sigFile,
      folderName
    );

    // Export PDF จาก Slides
    var pdfFile = exportSlideToPDF(slideResult.slideId, folderName, newFolder);

    // ลบไฟล์ภาพชั่วคราว (optional)
    photoFile.setTrashed(true);
    sigFile.setTrashed(true);

    return buildResponse({
      success: true,
      folderId:  newFolder.getId(),
      folderUrl: newFolder.getUrl(),
      slideUrl:  slideResult.slideUrl,
      pdfUrl:    pdfFile.getUrl()
    });

  } catch (err) {
    return buildResponse({ success: false, error: err.message });
  }
}

// -------------------------------------------------------
// สร้าง Google Slides และวาง stamp ลายเซ็น
// -------------------------------------------------------
function createSlideWithSignature(folder, photoFile, sigFile, title) {
  // สร้าง Presentation ใหม่
  var presentation = SlidesApp.create(title);
  var pres         = presentation;
  var slide        = pres.getSlides()[0];

  // ขนาด slide (px ที่ Google Slides ใช้ภายใน = EMU / 914400 inch * 96 dpi)
  // default size: 25.4cm x 19.05cm
  var slideW = pres.getPageWidth();   // points
  var slideH = pres.getPageHeight();  // points

  // ตั้งพื้นหลังสีขาว
  slide.getBackground().setSolidFill('#ffffff');

  // --- วางรูปบัตรประชาชน (ตรงกลาง บนครึ่ง) ---
  var photoId  = photoFile.getId();
  var photoImg = slide.insertImage(DriveApp.getFileById(photoId));

  var photoW = slideW * 0.75;
  var photoH = photoW * 0.63; // อัตราส่วนบัตร ID (85.6mm x 53.98mm ≈ 0.63)
  photoImg.setWidth(photoW);
  photoImg.setHeight(photoH);
  photoImg.setLeft((slideW - photoW) / 2);
  photoImg.setTop(slideH * 0.06);

  // --- วางลายเซ็น (stamp) ล่างขวา ---
  var sigId  = sigFile.getId();
  var sigImg = slide.insertImage(DriveApp.getFileById(sigId));

  var sigW = slideW * 0.32;
  var sigH = sigW * 0.35;
  sigImg.setWidth(sigW);
  sigImg.setHeight(sigH);
  sigImg.setLeft(slideW - sigW - slideW * 0.04);
  sigImg.setTop(slideH - sigH - slideH * 0.06);

  // --- เพิ่มข้อความวันที่ ---
  var dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  var textBox = slide.insertTextBox(
    "วันที่: " + dateStr,
    slideW * 0.04,
    slideH - 30,
    200,
    24
  );
  textBox.getText().getTextStyle().setFontSize(9).setForegroundColor('#546e7a');

  // ย้าย Presentation ไปยัง folder ที่สร้างใหม่
  var presFile = DriveApp.getFileById(presentation.getId());
  folder.addFile(presFile);
  DriveApp.getRootFolder().removeFile(presFile);

  return {
    slideId:  presentation.getId(),
    slideUrl: presentation.getUrl()
  };
}

// -------------------------------------------------------
// Export Google Slides เป็น PDF แล้วบันทึกใน folder
// -------------------------------------------------------
function exportSlideToPDF(slideId, fileName, folder) {
  var url     = "https://docs.google.com/presentation/d/" + slideId + "/export/pdf";
  var token   = ScriptApp.getOAuthToken();
  var options = {
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var pdfBlob  = response.getBlob().setName(fileName + ".pdf");
  var pdfFile  = folder.createFile(pdfBlob);

  return pdfFile;
}

// -------------------------------------------------------
// แปลง data URL เป็น Blob
// -------------------------------------------------------
function dataURLtoBlob(dataURL, filename) {
  var parts    = dataURL.split(',');
  var mimeType = parts[0].match(/:(.*?);/)[1];
  var b64      = parts[1];
  var decoded  = Utilities.base64Decode(b64);
  return Utilities.newBlob(decoded, mimeType, filename);
}

// -------------------------------------------------------
// Format timestamp เป็น string สำหรับชื่อโฟลเดอร์
// -------------------------------------------------------
function formatTimestamp(isoString) {
  try {
    var d = new Date(isoString);
    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear()
      + pad(d.getMonth() + 1)
      + pad(d.getDate())
      + "_"
      + pad(d.getHours())
      + pad(d.getMinutes())
      + pad(d.getSeconds());
  } catch(e) {
    return new Date().getTime().toString();
  }
}

// -------------------------------------------------------
// สร้าง JSON Response
// -------------------------------------------------------
function buildResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------
// GET handler (ทดสอบว่า deploy แล้วทำงาน)
// -------------------------------------------------------
function doGet(e) {
  return buildResponse({ status: "OK", message: "ID Card Web App Script is running" });
}
