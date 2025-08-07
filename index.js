const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API puente activa ✅");
});

app.post("/login", (req, res) => {
  const { usuario, clave } = req.body;
  
  if (usuario === "delfpc" && clave === "123") {
    return res.json({
      success: true,
      nombre: "Delfín Puma",
      rol: "admin"
    });
  } else {
    return res.json({
      success: false,
      message: "Credenciales incorrectas"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
