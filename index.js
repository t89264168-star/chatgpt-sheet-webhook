import express from "express";
import bodyParser from "body-parser";
import { google } from "googleapis";

const app = express();
app.use(bodyParser.json());

// ====== Environment Variables ======
const PORT = process.env.PORT || 3000;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID; 
const SHEET_NAME = process.env.SHEET_NAME || "相談ログ";
const API_KEY = process.env.WEBHOOK_API_KEY;

// ====== Google Auth ======
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function appendRow(values) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const range = `${SHEET_NAME}!A:Z`;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

// ====== Webhook Endpoint ======
app.post("/append-log", async (req, res) => {
  try {
    const key = req.headers["x-api-key"];
    if (!key || key !== API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = req.body;

    const row = [
      payload.date || new Date().toISOString().slice(0, 10),
      payload.theme || "",
      payload.question || "",
      payload.answer_summary || "",
      (payload.tags || []).join(", "),
      payload.importance || "",
      payload.link || ""
    ];

    await appendRow(row);

    res.json({ ok: true, message: "Row added to Google Sheets" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.get("/", (req, res) => {
  res.send("ChatGPT → Google Sheets Webhook is Running.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
