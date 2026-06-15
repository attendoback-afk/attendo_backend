# 🎓 Attendo Backend

نظام تسجيل الحضور والغياب — Express.js + Prisma + PostgreSQL

---

## 📁 هيكل المشروع

```
attendo_backend/
├── src/
│   ├── index.js                      ← نقطة البداية
│   ├── controllers/                  ← منطق كل endpoint
│   │   ├── auth.controller.js
│   │   ├── student.controller.js
│   │   ├── staff.controller.js
│   │   ├── department.controller.js
│   │   ├── class.controller.js
│   │   ├── module.controller.js
│   │   ├── room.controller.js
│   │   ├── session.controller.js
│   │   ├── attendance.controller.js
│   │   └── liveAttendance.controller.js
│   ├── routes/                       ← تعريف الـ endpoints
│   ├── middleware/
│   │   └── auth.middleware.js        ← JWT + Role check
│   ├── services/
│   │   └── email.service.js          ← إرسال OTP
│   └── utils/
│       └── prisma.js                 ← Prisma client
├── prisma/
│   └── schema.prisma
├── .env.example
└── package.json
```

---

## 🚀 تشغيل المشروع

### 1. تثبيت الـ packages
```bash
npm install
```

### 2. إعداد ملف .env
```bash
cp .env.example .env
# افتح الملف وحطي بيانات الـ database والإيميل
```

### 3. تشغيل الـ migrations
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. تشغيل السيرفر
```bash
npm run dev    # للتطوير (nodemon)
npm start      # للـ production
```

---

## 🔐 نظام الـ Authentication

### كيف بيشتغل؟

```
1. Register  →  بيتبعت OTP على الإيميل
2. Verify OTP  →  الحساب بيتفعّل
3. Login  →  بيرجع JWT token
4. كل request تاني  →  بتبعت الـ token في الهيدر
```

### إزاي تبعت الـ Token؟
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📡 API Endpoints

### 🔑 Auth  `/api/auth`

| Method | URL | الوصف | Auth مطلوب؟ |
|--------|-----|-------|-------------|
| POST | `/register` | تسجيل مستخدم جديد | ❌ |
| POST | `/verify-otp` | تفعيل الحساب بالـ OTP | ❌ |
| POST | `/resend-otp` | إعادة إرسال OTP | ❌ |
| POST | `/login` | تسجيل دخول | ❌ |
| GET | `/me` | بيانات المستخدم الحالي | ✅ |

**مثال Register:**
```json
POST /api/auth/register
{
  "fullName": "Ahmed Mohamed",
  "email": "ahmed@example.com",
  "password": "123456"
}
```

**مثال Verify OTP:**
```json
POST /api/auth/verify-otp
{
  "email": "ahmed@example.com",
  "otp": "483921"
}
```

**مثال Login Response:**
```json
{
  "success": true,
  "token": "eyJ...",
  "user": {
    "id": 1,
    "fullName": "Ahmed Mohamed",
    "email": "ahmed@example.com",
    "role": "PROFESSOR"
  }
}
```

---

### 🏫 Departments  `/api/departments`

| Method | URL | الوصف | Role |
|--------|-----|-------|------|
| GET | `/` | كل الأقسام | Any |
| GET | `/:id` | قسم واحد بتفاصيله | Any |
| POST | `/` | إنشاء قسم | MANAGER |
| PUT | `/:id` | تعديل قسم | MANAGER |
| DELETE | `/:id` | حذف قسم | MANAGER |

---

### 🎓 Classes  `/api/classes`

| Method | URL | الوصف | Role |
|--------|-----|-------|------|
| GET | `/` | كل الفصول | Any |
| GET | `/:id` | فصل واحد (+ طلابه + موادّه) | Any |
| POST | `/` | إنشاء فصل | MANAGER |
| PUT | `/:id` | تعديل فصل | MANAGER |
| DELETE | `/:id` | حذف فصل | MANAGER |
| POST | `/:id/modules` | إضافة مادة للفصل | MANAGER |
| DELETE | `/:id/modules/:moduleId` | حذف مادة من الفصل | MANAGER |

---

### 📚 Modules  `/api/modules`

| Method | URL | الوصف | Role |
|--------|-----|-------|------|
| GET | `/` | كل المواد | Any |
| GET | `/:id` | مادة واحدة | Any |
| POST | `/` | إنشاء مادة | MANAGER |
| PUT | `/:id` | تعديل مادة | MANAGER |
| DELETE | `/:id` | حذف مادة | MANAGER |

---

### 🚪 Rooms  `/api/rooms`

| Method | URL | الوصف | Role |
|--------|-----|-------|------|
| GET | `/` | كل القاعات | Any |
| POST | `/` | إضافة قاعة | MANAGER |
| PUT | `/:id` | تعديل قاعة | MANAGER |
| DELETE | `/:id` | حذف قاعة | MANAGER |

---

### 👨‍🎓 Students  `/api/students`

| Method | URL | الوصف | Role |
|--------|-----|-------|------|
| GET | `/` | كل الطلاب | MANAGER / PROFESSOR / ASSISTANT |
| GET | `/:id` | طالب واحد | Any |
| POST | `/` | إضافة طالب | MANAGER |
| PUT | `/:id` | تعديل بيانات طالب | MANAGER |
| DELETE | `/:id` | حذف طالب | MANAGER |
| GET | `/:id/attendance` | سجل حضور الطالب | Any |

**مثال إضافة طالب:**
```json
POST /api/students
{
  "fullName": "Sara Ali",
  "email": "sara@student.com",
  "password": "123456",
  "studentCode": "STU-001",
  "classId": 1
}
```

**مثال جلب حضور طالب مع فلاتر:**
```
GET /api/students/5/attendance?from=2025-01-01&to=2025-06-01
```

---

### 👩‍🏫 Staff  `/api/staff`

| Method | URL | الوصف | Role |
|--------|-----|-------|------|
| GET | `/` | كل الموظفين | MANAGER |
| GET | `/:id` | موظف واحد | MANAGER |
| POST | `/` | إضافة موظف | MANAGER |
| PUT | `/:id` | تعديل role موظف | MANAGER |
| DELETE | `/:id` | حذف موظف | MANAGER |

**الـ Roles المتاحة:** `PROFESSOR` / `MANAGER` / `ASSISTANT`

---

### 📅 Sessions  `/api/sessions`

> الـ Session هي المحاضرة المتكررة في الجدول (مثلاً: Math يوم الإثنين 9:00 AM)

| Method | URL | الوصف | Role |
|--------|-----|-------|------|
| GET | `/` | كل المحاضرات | Any |
| GET | `/:id` | محاضرة واحدة | Any |
| POST | `/` | إضافة محاضرة | MANAGER |
| PUT | `/:id` | تعديل محاضرة | MANAGER |
| DELETE | `/:id` | حذف محاضرة | MANAGER |

**مثال إضافة session:**
```json
POST /api/sessions
{
  "classId": 1,
  "moduleId": 2,
  "roomId": 1,
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "11:00"
}
```
> `dayOfWeek`: 0=الأحد، 1=الإثنين، ... 6=السبت

**فلاتر:**
```
GET /api/sessions?classId=1
GET /api/sessions?moduleId=3
```

---

### ✅ Attendance  `/api/attendance`

| Method | URL | الوصف | Role |
|--------|-----|-------|------|
| GET | `/` | كل السجلات (مع فلاتر) | Any |
| POST | `/` | تسجيل حضور طالب واحد يدوي | PROFESSOR / ASSISTANT / MANAGER |
| POST | `/bulk` | تسجيل حضور فصل كامل | PROFESSOR / ASSISTANT / MANAGER |
| PUT | `/:id` | تعديل حالة الحضور | PROFESSOR / ASSISTANT / MANAGER |
| DELETE | `/:id` | حذف سجل | MANAGER |
| GET | `/report/class/:classId` | تقرير حضور الفصل | PROFESSOR / ASSISTANT / MANAGER |

**مثال تسجيل يدوي:**
```json
POST /api/attendance
{
  "studentId": 5,
  "sessionId": 2,
  "date": "2025-06-01",
  "status": "PRESENT"
}
```
> **status**: `PRESENT` / `ABSENT` / `LATE`

**مثال Bulk (فصل كامل):**
```json
POST /api/attendance/bulk
{
  "sessionId": 2,
  "date": "2025-06-01",
  "attendances": [
    { "studentId": 1, "status": "PRESENT" },
    { "studentId": 2, "status": "ABSENT" },
    { "studentId": 3, "status": "LATE" }
  ]
}
```

**فلاتر الـ GET:**
```
GET /api/attendance?sessionId=2&date=2025-06-01
GET /api/attendance?classId=1&status=ABSENT
```

---

### 📡 Live Attendance  `/api/live`

> الأستاذ يفتح session، الطلاب يسجلوا حضورهم بـ secret code (QR)

#### Flow كامل:

```
1. الأستاذ يعمل POST /api/live/start
   → بيرجعله sessionId + secret (مثلاً: "A3F2")

2. الأستاذ يعرض الـ secret كـ QR code في الشاشة

3. كل طالب يعمل POST /api/live/join بالـ secret
   → حضوره بيتسجل تلقائياً

4. الأستاذ يعمل POST /api/live/close عشان يقفل الـ session
```

| Method | URL | الوصف | Role |
|--------|-----|-------|------|
| POST | `/start` | فتح session حضور مباشر | PROFESSOR / ASSISTANT / MANAGER |
| POST | `/join` | الطالب يسجل حضوره | STUDENT |
| POST | `/close` | إغلاق الـ session | PROFESSOR / ASSISTANT / MANAGER |
| GET | `/:sessionId/records` | مين سجل حضوره؟ | PROFESSOR / ASSISTANT / MANAGER |
| GET | `/my-sessions` | sessions الأستاذ | PROFESSOR / ASSISTANT / MANAGER |

**مثال Start:**
```json
// Response
{
  "success": true,
  "data": {
    "sessionId": "clxyz123",
    "secret": "A3F2",
    "startTime": "2025-06-01T09:00:00Z"
  }
}
```

**مثال Join (الطالب):**
```json
POST /api/live/join
{
  "secret": "A3F2"
}
```

---

## 🔒 ملخص الصلاحيات

| Action | STUDENT | ASSISTANT | PROFESSOR | MANAGER |
|--------|---------|-----------|-----------|---------|
| Login / Register | ✅ | ✅ | ✅ | ✅ |
| تسجيل حضور مباشر (join) | ✅ | ❌ | ❌ | ❌ |
| فتح/غلق live session | ❌ | ✅ | ✅ | ✅ |
| تسجيل حضور يدوي | ❌ | ✅ | ✅ | ✅ |
| إدارة الطلاب / Staff | ❌ | ❌ | ❌ | ✅ |
| إدارة الجدول / Modules | ❌ | ❌ | ❌ | ✅ |

---

## ⚠️ ملاحظات مهمة

1. **Gmail**: عشان تبعت OTP عن طريق Gmail، لازم تفعّل "App Password" من إعدادات الأمان
2. **JWT**: لو نسيت الـ secret في .env، كل الـ tokens القديمة هتبطل
3. **Prisma Error P2002**: يعني Unique constraint — الإيميل أو الكود موجود قبل كده
4. **dayOfWeek**: بيبدأ من 0 (الأحد) لـ 6 (السبت)
