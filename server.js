import "dotenv/config";
import express from "express";
import cors from "cors";
import twilio from "twilio";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();

// CONFIGURATION
const PUBLIC_URL = "https://delhi-sudarshan-backend.onrender.com"; 

// --- TWILIO CREDENTIALS---
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const ADMIN_PHONE = process.env.ADMIN_PHONE_NUMBER;

// API KEYS (For Browser Calling)
const API_KEY_SID = process.env.TWILIO_API_KEY_SID;
const API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;

// SAFETY CHECK: Ensure keys exist before starting
if (!ACCOUNT_SID || !API_KEY_SID) {
    console.error("CRITICAL ERROR: .env file is missing or empty!");
    console.error("Please create a .env file with your Twilio keys.");
    process.exit(1);
}

const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

// Test Data
let complaints = [];
let auditResults = {}; // Stores

app.use(cors({ origin: "*", allowedHeaders: ["Content-Type", "ngrok-skip-browser-warning"] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); 
app.use("/uploads", express.static("uploads"));

const upload = multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => { if (!fs.existsSync("uploads")) fs.mkdirSync("uploads"); cb(null, "uploads/"); },
    filename: (req, file, cb) => { cb(null, req.body.id + '-' + Date.now() + path.extname(file.originalname)); }
})});

// API 1: GENERATE WEBRTC TOKEN
app.get("/api/token", (req, res) => {
    const identity = "citizen"; 

    const videoGrant = new VoiceGrant({
        incomingAllow: true, // Allow receiving calls
    });

    const token = new AccessToken(
        ACCOUNT_SID,
        API_KEY_SID,
        API_KEY_SECRET,
        { identity: identity }
    );

    token.addGrant(videoGrant);

    res.json({ token: token.toJwt(), identity: identity });
});

// API 2: REJECT CALL (The Hack)
app.post("/api/reject-complaint", async (req, res) => {
    const { id, reason } = req.body;
    console.log(`Rejecting ${id}. Calling Virtual Citizen...`); 
    try {
        const call = await client.calls.create({
            twiml: `
                <Response>
                    <Say voice="Polly.Aditi" language="hi-IN">
                        नमस्ते। मैं ऑफिसर वाणी बोल रही हूँ।
                        आपकी शिकायत संख्या ${id.split('').join(' ')} को अस्वीकार कर दिया गया है।
                        इसका कारण है: ${reason}।
                        कृपया दोबारा शिकायत दर्ज करें। असुविधा के लिए खेद है।
                    </Say>
                </Response>
            `,
            to: 'client:citizen', 
            from: TWILIO_PHONE
        });
        console.log("WebRTC Call Initiated SID:", call.sid);
        
        const item = complaints.find(c => c.id === id);
        if (item) item.status = "Rejected";

        res.json({ success: true });

    } catch (error) {
        console.error("Twilio Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 📨 API 3: SMS
app.post("/api/new-complaint", async (req, res) => {
    const data = req.body;
    complaints.unshift(data); 
    console.log("Registered:", data.id);

    // SMS LOGIC
    let recipient = data.phone;
    if (recipient) {
        recipient = recipient.replace(/\s+/g, '').replace(/-/g, '');
        if (!recipient.startsWith('+')) recipient = '+91' + recipient;
    } else {
        recipient = ADMIN_PHONE;
    }

    const uploadLink = `${PUBLIC_URL}/upload.html?id=${data.id}`;

    try {
        await client.messages.create({
            body: `दिल्ली सुदर्शन\nशिकायत आईडी: ${data.id} रजिस्टर्ड |\n\n📷लाइव साक्ष्य अपलोड करें:\n${uploadLink}`,
            from: TWILIO_PHONE,
            to: recipient 
        });
        console.log(`SMS Sent to ${recipient}`);
        console.log(`${PUBLIC_URL}/upload.html?id=${data.id}`);
    } catch (err) {
        console.error("SMS Failed (Expected on Trial):", err.message);
    }
    res.json({ success: true });
});

// Photo Upload
app.post("/api/upload-photo", upload.single("photo"), (req, res) => {
    const fullImageUrl = `${PUBLIC_URL}/uploads/${req.file.filename}`;
    const item = complaints.find(c => c.id === req.body.id);
    if(item) { item.img = fullImageUrl; item.status = "Pending"; }
    res.json({ success: true, url: fullImageUrl });
});

app.get("/api/new-complaint", (req, res) => res.json(complaints));
// API 4: SURPRISE CLUSTER AUDIT
app.post("/api/audit-cluster", async (req, res) => {
    const { loc, dept, count } = req.body;
    console.log(`Initiating Surprise Audit for ${dept} in ${loc}`);

    try {
        const call = await client.calls.create({
            // URL points to a new endpoint that handles the IVR logic
            url: `${PUBLIC_URL}/api/audit-ivr`, 
            to: 'client:citizen', 
            from: TWILIO_PHONE
        });
        
        // Initialize status as 'pending'
        auditResults[call.sid] = 'pending';
        
        console.log("Audit Call SID:", call.sid);
        res.json({ success: true, callSid: call.sid }); // Send SID back to frontend

    } catch (error) {
        console.error("Twilio Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- 3. NEW: IVR HANDLING ENDPOINT (Twilio talks to this) ---
app.post("/api/audit-ivr", (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Gather Input
    const gather = twiml.gather({
        numDigits: 1,
        action: '/api/audit-result', // Send digits here
        method: 'POST',
        timeout: 10
    });

    gather.say({ voice: 'Polly.Aditi', language: 'hi-IN' },
                 "नमस्ते। यह दिल्ली सुदर्शन से एक औचक निरीक्षण कॉल है।" +
                 "${dept} विभाग का दावा है कि उन्होंने आपकी समस्या का समाधान कर दिया है।" +
                 "${loc} क्षेत्र के निवासी होने के नाते, क्या आप पुष्टि कर सकते हैं कि काम वास्तव में पूरा हो गया है?" +
                 "हाँ के लिए 1 दबाएँ। नहीं के लिए 2 दबाएँ।"
    );

    // If no input
    twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, "हमें कोई प्रतिक्रिया प्राप्त नहीं हुई।");
    
    res.type('text/xml');
    res.send(twiml.toString());
});

// --- 4. NEW: HANDLE KEYPRESS RESULT ---
app.post("/api/audit-result", (req, res) => {
    const digits = req.body.Digits;
    const callSid = req.body.CallSid;
    
    console.log(`Call ${callSid} pressed: ${digits}`);
    
    // Store the result!
    auditResults[callSid] = digits; 

    const twiml = new twilio.twiml.VoiceResponse();
    if (digits === '1') {
        twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, "पुष्टि करने के लिए धन्यवाद। आपका दिन शुभ हो।");
    } else {
        twiml.say({ voice: 'Polly.Aditi', language: 'hi-IN' }, "धन्यवाद। हम इसकी जांच करेंगे।");
    }
    
    res.type('text/xml');
    res.send(twiml.toString());
});

// --- 5. NEW: FRONTEND CHECK API ---
app.get("/api/check-audit-status/:sid", (req, res) => {
    const sid = req.params.sid;
    const status = auditResults[sid] || 'pending';
    res.json({ status: status });
});
app.listen(5000, () => console.log("Backend running on http://localhost:5000"));
