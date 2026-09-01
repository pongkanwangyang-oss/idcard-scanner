# สแกนบัตรประชาชน — Web App

## ไฟล์ที่สร้าง
- `index.html` — หน้า Web App (ถ่ายรูป + ลายเซ็น)
- `Code.gs` — Google Apps Script (backend: สร้าง Slides → PDF → Drive)

---

## วิธีติดตั้ง

### ขั้นตอนที่ 1: ตั้งค่า Google Apps Script

1. ไปที่ [https://script.google.com](https://script.google.com)
2. คลิก **"+ โปรเจกต์ใหม่"**
3. ลบโค้ดเดิมออกทั้งหมด แล้ว **วาง Code.gs** เข้าไปแทน
4. แก้ไข `PARENT_FOLDER_ID` ใน Code.gs:
   - เปิด Google Drive
   - สร้างโฟลเดอร์หลักที่ต้องการเก็บข้อมูล เช่น "บัตรประชาชน"
   - คลิกเข้าโฟลเดอร์ แล้วดู URL: `https://drive.google.com/drive/folders/`**`<ID อยู่ที่นี่>`**
   - นำ ID นั้นมาแทนที่ `YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE`

### ขั้นตอนที่ 2: Deploy เป็น Web App

1. คลิก **Deploy** → **New deployment**
2. เลือกประเภท: **Web app**
3. ตั้งค่า:
   - **Execute as**: Me (ชื่อ Google Account ของคุณ)
   - **Who has access**: Anyone (หรือ Anyone with Google Account ถ้าต้องการจำกัด)
4. คลิก **Deploy**
5. **คัดลอก URL** ที่ได้ (จะมีหน้าตาแบบ `https://script.google.com/macros/s/XXXX/exec`)

### ขั้นตอนที่ 3: ใส่ URL ใน index.html

เปิด `index.html` แล้วหาบรรทัด:
```js
const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_URL_HERE";
```
แทนที่ด้วย URL ที่ได้จาก Deploy:
```js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/XXXX/exec";
```

### ขั้นตอนที่ 4: Host หน้าเว็บ

เลือกวิธีใดวิธีหนึ่ง:

**ง่ายที่สุด — GitHub Pages (ฟรี)**
1. สร้าง repo บน GitHub
2. อัปโหลด `index.html`
3. เปิด Settings → Pages → Source: main branch
4. ได้ URL เช่น `https://username.github.io/repo-name/`

**หรือ — Netlify Drop (ฟรี, ไม่ต้องสมัคร)**
1. ไปที่ [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. ลาก `index.html` ไปวาง
3. ได้ URL ทันที

---

## ผลลัพธ์เมื่อกด "เสร็จสิ้น"

- สร้างโฟลเดอร์ใหม่ใน Drive ชื่อ `ID_YYYYMMDD_HHMMSS`
- ภายในโฟลเดอร์มี:
  - `ID_YYYYMMDD_HHMMSS.pdf` — ไฟล์ PDF พร้อมรูปบัตร + stamp ลายเซ็น
  - `ID_YYYYMMDD_HHMMSS` (Google Slides) — ไฟล์ Slides ต้นฉบับ

---

## หมายเหตุ
- ต้องให้สิทธิ์ Script เข้าถึง Drive และ Slides ครั้งแรก (Google จะถามอัตโนมัติ)
- รูปที่ส่งจะถูก encode เป็น Base64 ผ่าน HTTPS ทุกครั้ง
