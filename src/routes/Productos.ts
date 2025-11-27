import { Router, Request, Response } from "express";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  ScanCommand, 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand 
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';
import dotenv from "dotenv";

dotenv.config();

const router = Router();

// Configuración del Cliente DynamoDB
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN // Opcional, necesario si usas AWS Academy
  }
});

const docClient = DynamoDBDocumentClient.from(client);

// Lógica para seleccionar la tabla según el ambiente (Actividad 2)
const ENV = process.env.NODE_ENV || 'local'; 
const TABLE_NAME = `productos_${ENV}`; // productos_local o productos_prod

console.log(`[DynamoDB] Conectando a la tabla: ${TABLE_NAME}`);

// Interface del Producto
interface Producto {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string;
}

// 1. Crear Producto (CREATE)
router.post("/", async (req: Request, res: Response) => {
  const { nombre, precio, descripcion } = req.body;
  
  if(!nombre || !precio) {
    return res.status(400).json({ error: "Nombre y precio son requeridos" });
  }

  const newProduct: Producto = {
    id: uuidv4(),
    nombre,
    precio,
    descripcion: descripcion || ""
  };

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: newProduct
    }));
    res.status(201).json({ message: "Producto creado", producto: newProduct });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar en DynamoDB", details: err });
  }
});

// 2. Leer todos los Productos (READ ALL)
router.get("/", async (req: Request, res: Response) => {
  try {
    const command = new ScanCommand({ TableName: TABLE_NAME });
    const response = await docClient.send(command);
    res.json(response.Items);
  } catch (err) {
    res.status(500).json({ error: "Error al leer de DynamoDB", details: err });
  }
});

// 3. Leer un Producto por ID (READ ONE)
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id }
    });
    const response = await docClient.send(command);
    
    if (!response.Item) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    res.json(response.Item);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener producto", details: err });
  }
});

// 4. Actualizar Producto (UPDATE)
router.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, precio, descripcion } = req.body;

  try {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: "set nombre = :n, precio = :p, descripcion = :d",
      ExpressionAttributeValues: {
        ":n": nombre,
        ":p": precio,
        ":d": descripcion
      },
      ReturnValues: "ALL_NEW"
    });

    const response = await docClient.send(command);
    res.json({ message: "Producto actualizado", item: response.Attributes });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar", details: err });
  }
});

// 5. Eliminar Producto (DELETE)
router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id }
    }));
    res.json({ message: "Producto eliminado correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar", details: err });
  }
});

export default router;