<div align="center">
  <img src="favicon2.jpg" alt="Delhi Sudarshan Backend" width="120" height="120">

  # DELHI SUDARSHAN | Backend Core

  **The Intelligent Middleware for Civic Governance**

  [![Node.js](https://img.shields.io/badge/Runtime-Node.js_20-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
  [![Express](https://img.shields.io/badge/Framework-Express.js-000000?style=for-the-badge&logo=express)](https://expressjs.com/)
  [![Twilio](https://img.shields.io/badge/Telephony-Twilio_Voice-F22F46?style=for-the-badge&logo=twilio)](https://www.twilio.com/)
  [![Status](https://img.shields.io/badge/System-Operational-success?style=for-the-badge&logo=statuspage)](https://delhi-sudarshan-backend.onrender.com)

  <p align="center">
    A <strong>Stateless API Gateway</strong> that tunnels into legacy government databases.<br>
    Orchestrates <strong>AI Audits</strong>, routes <strong>Voice Traffic</strong>, and handles <strong>Secure Evidence Uploads</strong>.
  </p>
</div>

---

## 🏗️ Architecture: The "Legacy Tunnel"

This backend is designed as a **high-performance middleware layer**, not a traditional storage monolith. 

### Why No Database?
Government data resides in legacy mainframes (MCD/PWD SQL Servers). Migrating petabytes of data is costly and risky. 
* **Our Solution:** This backend acts as a **"Tunneling Layer"**. It receives intake data from the AI Voice Agent, temporarily caches it for processing, and routes it directly to the relevant department's legacy API endpoints.
* **Benefit:** Zero Data Redundancy, Instant Deployment, and Compliance with Data Sovereignty laws.

---

## ⚡ Key Capabilities

### 1. 🕵️‍♂️ The Citizen Assurance Call Engine
* **Logic:** Triggers the "Citizen Assurance call" loop. When an officer initiates a check, this engine randomly selects citizens from a specific cluster.
* **Telephony:** Uses **Twilio Programmable Voice** to place outbound calls to the `citizen.html` simulation client.
* **Verification:** Captures the citizen's response (DTMF/Voice) to verify if work was actually done.

### 2. 🔐 Secure Evidence Link (IDOR Protected)
* Generates one-time upload links (`/upload.html`) sent via SMS.
* Handles image processing and storage for evidence validation before passing it to the frontend dashboard.

### 3. 📡 Real-Time Event Bus
* Serves as the central nervous system, broadcasting events (New Complaint, Status Change, Audit Result) to the Officer Dashboard via REST polling/WebSockets.

---

## Interactive Demo Components

This repository hosts two critical simulation interfaces:

| Component | Endpoint | Description |
| :--- | :--- | :--- |
| **📱 Citizen Phone Sim** | `/citizen.html` | A WebRTC client that simulates a citizen's phone. **Open this on a mobile device** to receive the "Surprise Audit" call from the AI. |
| **📸 Evidence Portal** | `/upload.html` | The secure mobile page where citizens upload photos of potholes/garbage. |

---

## 🔌 API Documentation

### Core Endpoints

#### `GET /api/new-complaint`
* **Purpose:** Fetches the latest live complaints stream for the Dashboard.
* **Response:** JSON array of complaint objects (tunnelled from cache).

#### `POST /api/new-complaint`
* **Purpose:** Ingests structured data from the Gemini AI Voice Agent.
* **Payload:** `{ type, loc, desc, phone, dept }`

#### `POST /api/reject-complaint`
* **Purpose:** Triggers the **"Explanation Call"**.
* **Action:** Initiates an outbound call to the citizen explaining *why* their complaint was rejected by the officer.

### Audit Endpoints

#### `POST /api/audit-cluster`
* **Purpose:** Initiates the "Surprise Audit" on a specific sector.
* **Payload:** `{ loc: "Vasant Kunj", dept: "PWD", count: 5 }`
* **Action:** Triggers Twilio Voice API to call the simulation clients.

#### `GET /api/check-audit-status/:callSid`
* **Purpose:** Polls the status of an ongoing audit call.
* **Returns:** `1` (Verified/Success) or `2` (Fraud Detected).

---

## 🛠️ Installation & Setup

### Prerequisites
* Node.js v18+
* Twilio Account (SID & Auth Token)
* Render Account (for deployment)
cd delhi-sudarshan-backend
npm install
