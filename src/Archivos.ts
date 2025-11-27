import { Router } from "express";

import multer from "multer";

import { S3Client, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

import { Upload } from '@aws-sdk/lib-storage';

import * as fs from 'fs';

import * as path from 'path';

import stream from "stream";

import dotenv from "dotenv";

dotenv.config();

const router = Router();

const BUCKET_NAME = 'practica-2-745730';

console.log("AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? "SET" : "NOT SET");

console.log("AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY ? "SET" : "NOT SET");

console.log("BUCKET_NAME:", process.env.BUCKET_NAME);



const s3Client = new S3Client({

	region: process.env.AWS_REGION,

	credentials: {

		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,


		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,


		sessionToken: process.env.AWS_SESSION_TOKEN!

	}

});

const upload = multer({ storage: multer.memoryStorage() });





const uploadFileToS3 = async (bucketName: string, key: string, filePath: string, numExp: string): Promise<void> => {

	const fileStream = fs.createReadStream(filePath);

	const parallelUploader = new Upload({

		client: s3Client,

		params: {

			Bucket: bucketName,

			Key: key,

			Body: fileStream,

			Metadata: { 'expediente': numExp },

		},

	});

	await parallelUploader.done();

};



const downloadFileFromS3 = async (bucketName: string, key: string, downloadPath: string): Promise<void> => {

	const command = new GetObjectCommand({ Bucket: bucketName, Key: key });

	const response = await s3Client.send(command);

	if (response.Body) {

		const writableStream = fs.createWriteStream(downloadPath);

		(response.Body as stream.Readable).pipe(writableStream);

		await new Promise<void>(resolve => writableStream.on('finish', () => resolve()));

	} else {

		throw new Error('No se pudo descargar el archivo, Body vacío.');

	}

};



const deleteFileFromS3 = async (bucketName: string, key: string): Promise<void> => {

	await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));

};





router.get("/archivos", async (req, res) => {

	try {

		const data = await s3Client.send(new ListObjectsV2Command({ Bucket: BUCKET_NAME }));

		const archivos = data.Contents?.map(f => f.Key) || [];

		res.json({ archivos });

	} catch (err) { res.status(500).json({ error: err }); }

});





router.post("/archivos", upload.single("archivo"), async (req, res) => {

	if (!req.file) return res.status(400).json({ error: "Archivo faltante" });



	const tempPath = path.join(__dirname, "../uploads", req.file.originalname);

	if (!fs.existsSync(path.dirname(tempPath))) fs.mkdirSync(path.dirname(tempPath));

	fs.writeFileSync(tempPath, req.file.buffer);



	try {

		await uploadFileToS3(BUCKET_NAME, req.file.originalname, tempPath, '745730');

		fs.unlinkSync(tempPath);

		res.status(201).json({ mensaje: "Archivo subido a S3", archivo: req.file.originalname });

	} catch (err) { res.status(500).json({ error: err }); }

});



router.get("/archivos/:nombre", async (req, res) => {

	const { nombre } = req.params;

	const downloadPath = path.join(__dirname, "../downloads", nombre);

	if (!fs.existsSync(path.dirname(downloadPath))) fs.mkdirSync(path.dirname(downloadPath));



	try {

		await downloadFileFromS3(BUCKET_NAME, nombre, downloadPath);

		res.download(downloadPath, nombre, () => fs.unlinkSync(downloadPath));

	} catch (err) { res.status(404).json({ error: "Archivo no encontrado en S3" }); }

});



router.delete("/archivos/:nombre", async (req, res) => {

	const { nombre } = req.params;

	try {

		await deleteFileFromS3(BUCKET_NAME, nombre);

		res.json({ mensaje: "Archivo eliminado", archivo: nombre });

	} catch (err) { res.status(500).json({ error: err }); }

});



export default router;
