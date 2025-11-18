import { Router } from "express";
import multer from "multer";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import stream from "stream";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const ENV = process.env.ENVIRONMENT || "local";
const BUCKET = process.env.BUCKET_NAME;

/* ---------------------------------------------------
   SI NO ES PRODUCCIÓN → BLOQUEAMOS TODAS LAS RUTAS S3
------------------------------------------------------ */
if (ENV !== "prod") {
  router.all("*", (req, res) => {
    res.status(403).json({
      error: "Las rutas de S3 solo están disponibles en producción",
      ambiente_actual: ENV
    });
  });
}

/* ---------------------------------------------------
   SOLUCIÓN: Creamos el router condicionalmente y al final lo exportamos
------------------------------------------------------ */

let s3: S3Client | null = null;

if (ENV === "prod") {
  s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          }
        : undefined,
  });

  /* --------------------------- LISTAR ARCHIVOS --------------------------- */
  router.get("/", async (req, res) => {
    try {
      const data = await s3!.send(new ListObjectsV2Command({ Bucket: BUCKET }));
      const archivos = data.Contents?.map(obj => obj.Key) || [];
      res.json({ archivos });
    } catch (error) {
      res.status(500).json({ error: "Error al listar archivos", detalle: error });
    }
  });

  /* --------------------------- SUBIR ARCHIVO --------------------------- */

  router.post("/", upload.single("archivo"), async (req, res) => {
    if (!req.file)
      return res.status(400).json({ error: "Debe enviar un archivo" });

    try {
      await s3!.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: req.file.originalname,
          Body: req.file.buffer,
        })
      );

      res.status(201).json({
        mensaje: "Archivo subido correctamente",
        archivo: req.file.originalname,
      });

    } catch (error) {
      res.status(500).json({ error: "Error al subir archivo", detalle: error });
    }
  });

  /* --------------------------- DESCARGAR ARCHIVO --------------------------- */

  router.get("/:nombre", async (req, res) => {
    const nombre = req.params.nombre;

    const downloadPath = path.join(__dirname, "../downloads", nombre);
    const dir = path.dirname(downloadPath);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir);

    try {
      const response = await s3!.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: nombre })
      );

      if (!response.Body)
        return res.status(404).json({ error: "Archivo vacío o inexistente" });

      const writable = fs.createWriteStream(downloadPath);
      (response.Body as stream.Readable).pipe(writable);

      writable.on("finish", () => {
        res.download(downloadPath, nombre, () => {
          fs.unlinkSync(downloadPath); // eliminar temporal
        });
      });

    } catch (error) {
      res.status(404).json({ error: "Archivo no encontrado en S3" });
    }
  });

  /* --------------------------- ELIMINAR ARCHIVO --------------------------- */

  router.delete("/:nombre", async (req, res) => {
    const nombre = req.params.nombre;

    try {
      await s3!.send(
        new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: nombre,
        })
      );

      res.json({ mensaje: "Archivo eliminado", archivo: nombre });

    } catch (error) {
      res.status(500).json({ error: "No se pudo eliminar", detalle: error });
    }
  });
}

export default router;
