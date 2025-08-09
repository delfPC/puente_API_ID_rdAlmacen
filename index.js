// index.js
import express from "express";
import fetch from "node-fetch"; // o axios
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// URL de tu Web App (Apps Script) desplegada como "Cualquiera con el enlace"
const GAS_URL = process.env.GAS_URL; // << PON esto en variables de entorno en Render

app.post("/login", async (req, res) => {
  try {
    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", ...req.body }),
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

app.post("/register", async (req, res) => {
  try {
    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", ...req.body }),
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

app.post("/delete", async (req, res) => {
  try {
    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ...req.body }),
    });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor activo en puerto", PORT));
