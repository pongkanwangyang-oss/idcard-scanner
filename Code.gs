// =====================================================
// Google Apps Script — Code.gs
// Template Slides → แทนที่ placeholder → Export PDF
// =====================================================

var TEMPLATE_SLIDE_ID = "1MIxME7lcsKCgsTSdSA4mvNFtmzNpfuou3Qu57s6LBLM";
var PARENT_FOLDER_ID  = "1A6QTPkC_62MR4ZCyrZX5DrRW-ubdweMs";

// -------------------------------------------------------
// POST handler — รับข้อมูลจาก Web App
// -------------------------------------------------------
function doPost(e) {
  try {
    var data      = JSON.parse(e.postData.contents);
    var photoB64  = data.photo;         // รูปบัตรประชาชน
    var petitions = data.petitions || []; // array สูงสุด 4 รูป
    var sigB64    = data.signature;     // ลายเซ็น
    var timestamp = data.timestamp || new Date().toISOString();

    // --- สร้างโฟลเดอร์ใหม่ ชื่อ วันที่_เวลา ---
    var folderName   = formatFolderName(timestamp);
    var parentFolder = DriveApp.getFolderById(PARENT_FOLDER_ID);
    var newFolder    = parentFolder.createFolder(folderName);

    // --- Copy template Slides ไปยังโฟลเดอร์ใหม่ ---
    var templateFile = DriveApp.getFileById(TEMPLATE_SLIDE_ID);
    var copyFile     = templateFile.makeCopy(folderName, newFolder);
    var pres         = SlidesApp.openById(copyFile.getId());

    // --- แปลง base64 → Blob → อัปโหลดเป็น image ใน Drive ---
    var idBlob  = base64ToBlob(photoB64,  "idcard.jpg");
    var sigBlob = base64ToBlob(sigB64,    "signature.png");

    var idFile  = newFolder.createFile(idBlob);

    // สร้างไฟล์ลายเซ็น 2 ก๊อป เพราะต้องใส่ใน 2 slide แยกกัน
    // (Drive API ไม่อนุญาตให้ใช้ไฟล์เดียวแทรกในหลายตำแหน่ง)
    var sigFile1 = newFolder.createFile(base64ToBlob(sigB64, "signature_1.png"));
    var sigFile2 = newFolder.createFile(base64ToBlob(sigB64, "signature_2.png"));

    // petition files (สูงสุด 4, แต่ใส่ใน placeholder แค่ 1-2)
    var petitionFiles = [];
    for (var i = 0; i < petitions.length && i < 4; i++) {
      var pBlob = base64ToBlob(petitions[i], "attachment_" + (i+1) + ".jpg");
      petitionFiles.push(newFolder.createFile(pBlob));
    }

    // --- แทนที่ placeholder ด้วยรูปภาพ ---
    replaceImagePlaceholder(pres, "<<IDCard>>",       idFile,    false);
    replaceImagePlaceholder(pres, "<<Signature>>",    sigFile1,  false); // slide แรกที่เจอ
    replaceImagePlaceholder(pres, "<<Signature>>",    sigFile2,  false); // slide ต่อไปที่ยังเหลือ

    if (petitionFiles.length > 0) {
      replaceImagePlaceholder(pres, "<<Attachment_1>>", petitionFiles[0], false);
    }
    if (petitionFiles.length > 1) {
      replaceImagePlaceholder(pres, "<<Attachment_2>>", petitionFiles[1], false);
    }
    // ถ้า placeholder ยังเหลือ (กรณีไม่มีรูป) ให้ลบ text นั้นทิ้ง
    clearRemainingPlaceholders(pres, ["<<Attachment_1>>","<<Attachment_2>>"]);

    // บันทึก Slides
    pres.saveAndClose();

    // --- Export PDF ---
    var pdfBlob = exportToPDF(copyFile.getId(), folderName);
    var pdfFile = newFolder.createFile(pdfBlob);

    // --- คงไฟล์ทั้งหมดไว้ในโฟลเดอร์ ไม่ลบ ---
    // (idFile, sigFile1, sigFile2, petitionFiles ทั้งหมด คงอยู่)

    return jsonResponse({
      success:   true,
      folderUrl: newFolder.getUrl(),
      slideUrl:  copyFile.getUrl(),
      pdfUrl:    pdfFile.getUrl()
    });

  } catch (err) {
    return jsonResponse({ success: false, error: err.message + "\n" + err.stack });
  }
}

// -------------------------------------------------------
// แทนที่ placeholder text ด้วยรูปภาพ
// replaceAll = true  → แทนที่ทุก slide ที่พบ
// replaceAll = false → แทนที่แค่ slide แรกที่พบแล้วหยุด (default)
// -------------------------------------------------------
function replaceImagePlaceholder(pres, placeholder, imageFile, replaceAll) {
  var slides  = pres.getSlides();
  var imageId = imageFile.getId();

  for (var s = 0; s < slides.length; s++) {
    var slide    = slides[s];
    var elements = slide.getPageElements();
    var replaced = false;

    for (var i = elements.length - 1; i >= 0; i--) {
      var el = elements[i];
      if (el.getPageElementType() !== SlidesApp.PageElementType.SHAPE) continue;

      var text = el.asShape().getText().asString().trim();
      if (text !== placeholder) continue;

      var left   = el.getLeft();
      var top    = el.getTop();
      var width  = el.getWidth();
      var height = el.getHeight();

      var img = slide.insertImage(DriveApp.getFileById(imageId));
      img.setLeft(left).setTop(top).setWidth(width).setHeight(height);
      el.remove();
      replaced = true;
    }

    // ถ้าไม่ replaceAll และ slide นี้มีการแทนที่แล้ว → หยุด
    if (replaced && !replaceAll) return true;
  }
  return false;
}

// -------------------------------------------------------
// ลบ placeholder ที่ยังเหลือ (กรณีไม่มีรูป)
// -------------------------------------------------------
function clearRemainingPlaceholders(pres, placeholders) {
  var slides = pres.getSlides();
  for (var s = 0; s < slides.length; s++) {
    var elements = slides[s].getPageElements();
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el.getPageElementType() === SlidesApp.PageElementType.SHAPE) {
        var text = el.asShape().getText().asString().trim();
        for (var p = 0; p < placeholders.length; p++) {
          if (text === placeholders[p]) {
            el.asShape().getText().setText("");
            break;
          }
        }
      }
    }
  }
}

// -------------------------------------------------------
// Export Slides → PDF blob
// -------------------------------------------------------
function exportToPDF(slideId, filename) {
  var url     = "https://docs.google.com/presentation/d/" + slideId + "/export/pdf";
  var token   = ScriptApp.getOAuthToken();
  var res     = UrlFetchApp.fetch(url, {
    headers: { Authorization: "Bearer " + token },
    muteHttpExceptions: true
  });
  return res.getBlob().setName(filename + ".pdf");
}

// -------------------------------------------------------
// base64 data URL → Blob
// -------------------------------------------------------
function base64ToBlob(dataURL, filename) {
  var parts    = dataURL.split(",");
  var mimeType = parts[0].match(/:(.*?);/)[1];
  var decoded  = Utilities.base64Decode(parts[1]);
  return Utilities.newBlob(decoded, mimeType, filename);
}

// -------------------------------------------------------
// สร้างชื่อโฟลเดอร์จาก timestamp → "DD-MM-YYYY_HH-MM"
// -------------------------------------------------------
function formatFolderName(isoString) {
  var d   = new Date(isoString);
  var tz  = Session.getScriptTimeZone();
  return Utilities.formatDate(d, tz, "dd-MM-yyyy_HH-mm");
}

// -------------------------------------------------------
// JSON response helper
// -------------------------------------------------------
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------
// GET — ทดสอบว่า deploy แล้วทำงาน
// -------------------------------------------------------
function doGet(e) {
  return jsonResponse({ status: "OK", message: "Script is running" });
}
