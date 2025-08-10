// index.js
import express from "express";
import cors from "cors";

// ========= Config básica =========
const app = express();
app.use(cors());
app.use(express.json());

const GAS_URL = process.env.GAS_URL; // <-- define esto en Render (Environment → Environment Variables)
if (!GAS_URL) {
  console.warn(
    "[WARN] Falta GAS_URL. Configúrala en variables de entorno. El servidor responderá 500 en rutas de API."
  );
}

// Helper para reenviar al Apps Script con timeout y buen manejo de errores
async function forwardToGAS(payload) {
  if (!GAS_URL) {
    return { status: 500, body: { success: false, message: "GAS_URL no configurada" } };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20s
  try {
    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // GAS debería devolver JSON; si no, devolvemos el texto crudo para depurar
      data = { success: false, message: "Respuesta no-JSON desde GAS", raw: text };
    }
    return { status: r.ok ? 200 : r.status, body: data };
  } catch (e) {
    clearTimeout(timeout);
    const msg = e?.name === "AbortError" ? "Timeout al contactar GAS" : String(e);
    return { status: 500, body: { success: false, message: msg } };
  }
}

// ========= Rutas =========

// Salud
app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "puente_API_ID_rdAlmacen",
    gasConfigured: Boolean(GAS_URL),
  });
});

// ¿_usuarios está vacía?
app.post("/check", async (_req, res) => {
  const out = await forwardToGAS({ action: "check_empty" });
  res.status(out.status).json(out.body);
});

// Login normal
app.post("/login", async (req, res) => {
  const { usuario, clave, pc_origen } = req.body || {};
  const out = await forwardToGAS({ action: "login", usuario, clave, pc_origen });
  res.status(out.status).json(out.body);
});

// Registro
app.post("/register", async (req, res) => {
  const { usuario, clave, nombre, apellido_pat, respuesta, pc_origen, rol } = req.body || {};
  const out = await forwardToGAS({
    action: "register",
    usuario,
    clave,
    nombre,
    apellido_pat,
    respuesta,
    pc_origen,
    rol,
  });
  res.status(out.status).json(out.body);
});

// Eliminar (o deshabilitar según tu GAS; aquí lo borra)
app.post("/delete", async (req, res) => {
  const { usuario } = req.body || {};
  const out = await forwardToGAS({ action: "delete", usuario });
  res.status(out.status).json(out.body);
});

// Login con Google (recibe id_token del cliente)
app.post("/google_login", async (req, res) => {
  const { id_token } = req.body || {};
  const out = await forwardToGAS({ action: "google_login", id_token });
  res.status(out.status).json(out.body);
});

// ========= Arranque =========
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`[OK] Servicio activo en puerto ${PORT}`);
  console.log(`[INFO] GAS_URL configurada: ${GAS_URL ? "sí" : "no"}`);
});
