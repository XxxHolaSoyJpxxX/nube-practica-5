import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

import archivosRoutes from "./routes/Archivos";
import productosRoutes from "./routes/Productos"; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// --- Configuración Multer Local (De tu archivo original) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const localUpload = multer({ storage });

// --- Rutas Locales ---
app.get("/local/archivos", (req, res) => {
  const dir = path.join(__dirname, "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const files = fs.readdirSync(dir);
  res.json({ archivos: files });
});

app.post("/local/archivos", localUpload.single("archivo"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Archivo faltante" });
  res.status(201).json({ mensaje: "Archivo subido localmente", archivo: req.file.filename });
});

app.get("/local/archivos/:nombre", (req, res) => {
  const { nombre } = req.params;
  const filePath = path.join(__dirname, "uploads", nombre);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Archivo no encontrado" });
  res.download(filePath);
});

// --- Integración de Rutas AWS ---

// 1. Rutas de S3 (Tu archivo Archivos.ts)
// Asegúrate de que exportas 'router' como default en Archivos.ts
app.use("/object-storage", archivosRoutes);

// 2. Rutas de DynamoDB (Actividad 2 - CRUD)
app.use("/api/productos", productosRoutes);

// Health Check (Útil para AWS Load Balancers o Docker)
app.get("/", (req, res) => {
  res.send(`API Funcionando en ambiente: ${process.env.NODE_ENV || 'local'}`);
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'local'}`);
});