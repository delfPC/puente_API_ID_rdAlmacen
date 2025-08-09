// index.js
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Config en Render: agregar GAS_URL como variable de entorno
const GAS_URL = process.env.GAS_URL;

// Salud (opcional)
app.get("/", (_req, res) => res.json({ ok: true }));

// ---- CHECK: ¿_usuarios está vacío? ----
app.post("/check", async (_req, res) => {
  try {
    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check_empty" }),
    });
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// ---- LOGIN ----
app.post("/login", async (req, res) => {
  try {
    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", ...req.body }),
    });
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// ---- REGISTER ----
app.post("/register", async (req, res) => {
  try {
    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "register", ...req.body }),
    });
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

// ---- DELETE (soft delete) ----
app.post("/delete", async (req, res) => {
  try {
    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ...req.body }),
    });
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ success: false, message: String(e) });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Servidor activo en puerto", PORT));
