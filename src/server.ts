import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import archivosRoutes from "./routes/archivosRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ENV = process.env.ENVIRONMENT || "local";

app.use(express.json());

console.log(`🚀 Iniciando aplicación en ambiente: ${ENV}`);

/* ----------------------------- CONFIG LOCAL ----------------------------- */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, file.originalname),
});

const localUpload = multer({ storage });

/* ----------------------------- CRUD LOCAL SOLO EN LOCAL ----------------------------- */

if (ENV === "local") {
  console.log("📁 Modo LOCAL: habilitando rutas /local/archivos");

  app.get("/local/archivos", (req, res) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const files = fs.readdirSync(dir);
    res.json({ archivos: files });
  });

  app.post("/local/archivos", localUpload.single("archivo"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Archivo faltante" });
    res.status(201).json({
      mensaje: "Archivo subido localmente",
      archivo: req.file.filename,
    });
  });

  app.get("/local/archivos/:nombre", (req, res) => {
    const { nombre } = req.params;
    const filePath = path.join(__dirname, "uploads", nombre);
    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: "Archivo no encontrado" });
    res.download(filePath);
  });
}

/* ----------------------------- CRUD S3 SOLO EN PROD ----------------------------- */

if (ENV === "prod") {
  console.log("🟦 Modo PRODUCCIÓN: habilitando rutas /archivos (S3)");
  app.use("/archivos", archivosRoutes);
}

/* ----------------------------- SERVIDOR ----------------------------- */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});
