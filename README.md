# 🛡️ Anti-Ragging Reporting System

A full-stack mobile application designed to empower students to securely report ragging incidents and allow faculty/admin to investigate and resolve them efficiently. Built with **Flutter**, **Node.js (Express)**, and **Supabase (PostgreSQL)**.

## 🚀 Tech Stack

### **Client (Mobile App)**
* **Framework:** Flutter (Dart)
* **Architecture:** Clean Architecture (Presentation, Domain, Data Layers)
* **State Management:** BLoC / Riverpod (Recommended)

### **Server (Backend)**
* **Runtime:** Node.js
* **Framework:** Express.js
* **Language:** JavaScript (CommonJS)
* **ORM:** Prisma
* **Authentication:** JWT (JSON Web Tokens) & bcryptjs

### **Database & Storage**
* **Database:** PostgreSQL (Hosted on Supabase)
* **Storage:** Supabase Storage (for evidence images/PDFs)

---

## 📱 Features by Role

### 🎓 Student
* **Secure Login/Register:** Create an account linked to a specific department.
* **File Complaint:** Submit detailed reports including incident date, location, description, and severity.
* **Identify Accused:** Ability to name specific students, link to registered users, or describe unknown seniors.
* **Upload Evidence:** Attach images or documents securely.
* **Track Status:** View real-time updates on complaint investigation (Pending -> Resolved).

### 👨‍🏫 Faculty
* **Dashboard:** View complaints assigned specifically to them.
* **Investigation:** Update status, add remarks, and review evidence.

### 👮 Admin
* **User Management:** Manage student and faculty accounts.
* **Complaint Triage:** Review incoming complaints and assign them to faculty members.
* **Oversight:** Monitor resolution timelines and severity levels.

---

## 🗄️ Database Schema (Normalized)

The database is designed with strict normalization and integrity constraints.

* **`users`**: Stores login credentials and role IDs.
* **`roles`**: Lookup table (1: Student, 2: Faculty, 3: Admin).
* **`complaints`**: Core incident data.
* **`complaint_accused`**: (One-to-Many) Stores details of accused persons. Contains a check constraint: `CHECK (user_id IS NOT NULL OR accused_name IS NOT NULL)`.
* **`evidence`**: (One-to-Many) Links files to complaints.
* **`departments`**, **`severity_levels`**, **`complaint_status`**: Lookup tables for consistency.

---

## 🛠️ Installation & Setup

### 1. Prerequisites
* Node.js & npm installed.
* Flutter SDK installed.
* A Supabase project created.

### 2. Backend Setup
```bash
# Clone the repository
git clone [https://github.com/Nadish-prog/anti-ragging-app.git](https://github.com/anti-raging/anti-ragging-app.git)
cd anti-ragging-app/backend

# Install dependencies
npm install

# Setup Environment Variables
# Create a .env file and add:
# DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
# JWT_SECRET="your_secret_key"

# Generate Prisma Client
npx prisma generate

# Run the Server
npm run dev
