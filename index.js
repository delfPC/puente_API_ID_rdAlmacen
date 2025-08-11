// index.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";

// ====== Config ======
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "50kb" }));

const GAS_URL         = process.env.GAS_URL;                 // URL /exec del GAS
const PEPPER          = process.env.PEPPER || "";            // pimienta global
const SA_USER         = process.env.SUPERADMIN_USER || "";   // superusuario
const SA_HASH         = process.env.SUPERADMIN_HASH || "";   // bcrypt hash (de "clave + PEPPER")
const PORT            = process.env.PORT || 10000;

if (!GAS_URL) console.warn("[WARN] Falta GAS_URL");
if (!SA_USER || !SA_HASH) console.warn("[WARN] Superadmin no configurado (SUPERADMIN_USER/HASH)");

// ====== Helpers ======
async function callGAS(payload){
  if (!GAS_URL) throw new Error("GAS_URL no configurada");
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 20000);
  try{
    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const txt = await r.text();
    let json; try{ json = JSON.parse(txt); }catch{ json = { success:false, message:"Respuesta no-JSON", raw:txt }; }
    return json;
  } finally { clearTimeout(timer); }
}

// Limites
const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 100 });   // 100 intentos/15min por IP
const registerLimiter = rateLimit({ windowMs: 15*60*1000, max: 50 });

// ====== Rutas ======
app.get("/", (req,res)=> {
  res.json({ ok:true, service:"puente-api-id-rdalmacen", gasConfigured: !!GAS_URL });
});

// ¿Vacío?
app.post("/check", async (req,res)=>{
  try { res.json(await callGAS({ action:"check_empty" })); }
  catch(e){ res.status(500).json({ success:false, message:String(e) }); }
});

// Login seguro (Node compara bcrypt; GAS solo persiste)
app.post("/login", loginLimiter, async (req,res)=>{
  try{
    const { usuario, clave, pc_origen } = req.body || {};
    if (!usuario || !clave) return res.json({ success:false, message:"Usuario y clave requeridos" });

    // 1) Superadmin local (no usa GAS)
    if (SA_USER && SA_HASH && usuario === SA_USER) {
      const ok = await bcrypt.compare(String(clave) + PEPPER, SA_HASH);
      if (!ok) return res.json({ success:false, message:"Credenciales inválidas" });
      return res.json({ success:true, usuario: SA_USER, nombre:"Super Admin", rol:"super" });
    }

    // 2) Usuarios en GAS
    const resp = await callGAS({ action:"user_get", usuario });
    if (!resp.success || !resp.user) return res.json({ success:false, message:"Usuario no encontrado" });

    const u = resp.user;
    if (String(u.activo).toUpperCase() !== "SI") return res.json({ success:false, message:"Usuario inactivo" });
    if (!u.clave_hash) return res.json({ success:false, message:"Usuario sin clave configurada" });

    const ok = await bcrypt.compare(String(clave) + PEPPER, String(u.clave_hash));
    if (!ok) return res.json({ success:false, message:"Credenciales inválidas" });

    // 3) Touch login
    await callGAS({ action:"user_touch_login", usuario, pc_origen });

    res.json({ success:true, usuario, nombre: u.nombre || "", rol: u.rol || "user" });
  }catch(e){
    res.status(500).json({ success:false, message:String(e) });
  }
});

// Registrar (Node hashea y manda clave_hash)
app.post("/register", registerLimiter, async (req,res)=>{
  try{
    const { usuario, clave, nombre, apellido_pat, pc_origen, rol="user", respuesta } = req.body || {};
    if (!usuario || !clave || !nombre) return res.json({ success:false, message:"usuario, clave y nombre son requeridos" });

    const clave_hash = await bcrypt.hash(String(clave) + PEPPER, 12);
    const payload = {
      action:"user_create",
      usuario, clave_hash, nombre,
      apellido_pat: apellido_pat || "",
      pc_origen: pc_origen || "",
      rol,
      // si quieres guardar respuesta de recuperación, mándala ya hasheada aquí:
      // respuesta_hash: await bcrypt.hash(String(respuesta) + PEPPER, 12)
    };
    const out = await callGAS(payload);
    res.json(out);
  }catch(e){
    res.status(500).json({ success:false, message:String(e) });
  }
});

// Deshabilitar usuario (soft delete)
app.post("/delete", async (req,res)=>{
  try{
    const { usuario } = req.body || {};
    if (!usuario) return res.json({ success:false, message:"usuario requerido" });
    const out = await callGAS({ action:"user_disable", usuario });
    res.json(out);
  }catch(e){
    res.status(500).json({ success:false, message:String(e) });
  }
});

// (Opcional) Bootstrap admin si está vacío (ejecútalo 1 vez desde Postman/PowerShell)
app.post("/bootstrap_admin", async (req,res)=>{
  try{
    if (!SA_USER || !SA_HASH) return res.json({ success:false, message:"Superadmin no configurado" });
    const chk = await callGAS({ action:"check_empty" });
    if (!chk.success) return res.json(chk);
    if (!chk.empty)  return res.json({ success:true, message:"Ya existen usuarios. No se crea admin." });

    const out = await callGAS({
      action:"user_create",
      usuario: SA_USER,
      clave_hash: SA_HASH,
      nombre: "Administrador",
      apellido_pat: "",
      pc_origen: "bootstrap",
      rol: "admin"
    });
    res.json(out);
  }catch(e){
    res.status(500).json({ success:false, message:String(e) });
  }
});

// ====== Start ======
app.listen(PORT, ()=> {
  console.log(`[OK] Servicio en puerto ${PORT}`);
  console.log(`[INFO] GAS_URL: ${GAS_URL ? "OK" : "FALTA"}`);
});
