import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
// CORRECCIÓN: Si Archivos.ts está en la raíz, la ruta es ./Archivos
// Si mueves Archivos.ts a la carpeta routes, entonces usa ./routes/Archivos
import files from "./Archivos"; 
import productos from "./routes/Productos"; // Nueva ruta de DynamoDB
import dotenv from "dotenv";

dotenv.config();

const app = express();
// Usa el puerto del entorno o 3000 por defecto
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

app.use(express.json());

// Rutas
app.use("/object-storage", files);
app.use("/api/productos", productos);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});