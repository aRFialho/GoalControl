import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import "./env";
import {
  announceSale,
  createProduct,
  createProductsBatch,
  ensureGoalSeed,
  getSnapshot,
  ProductPayload,
  updateGoals,
  updateProduct
} from "./logic";
import { WsMessage } from "./types";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const productSchema = z.object({
  type: z.enum(["OUTLET", "RELAUNCH"]),
  imageUrl: z.string().min(1, "Imagem e obrigatoria."),
  name: z.string().min(2, "Nome e obrigatorio."),
  reference: z.string().min(1, "Referencia e obrigatoria."),
  stock: z.coerce.number().int().min(0, "Estoque deve ser >= 0.")
});

const productsBatchSchema = z.object({
  products: z
    .array(productSchema)
    .min(1, "Envie ao menos 1 produto no lote.")
    .max(200, "Limite de 200 produtos por lote.")
});

const saleSchema = z.object({
  productId: z.string().uuid("Produto invalido."),
  quantity: z.coerce.number().int().min(1, "Quantidade deve ser >= 1.")
});

const goalsSchema = z.object({
  month: z.coerce.number().int().min(0),
  week: z.coerce.number().int().min(0),
  fortnight: z.coerce.number().int().min(0)
});

const clients = new Set<WebSocket>();

function sendMessage(socket: WebSocket, message: WsMessage) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcast(message: WsMessage) {
  for (const client of clients) {
    sendMessage(client, message);
  }
}

function extractZodIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue?.message ?? "Payload invalido.";
}

function normalizeKnownError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return extractZodIssue(error);
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  ) {
    return "Referencia duplicada. Cada produto precisa ter uma referencia unica.";
  }

  if (error instanceof Error) {
    return error.message;
  }
  return "Erro inesperado.";
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "GoalControl API" });
});

app.get("/api/state", async (_req, res) => {
  try {
    const snapshot = await getSnapshot();
    res.json({ snapshot });
  } catch (error) {
    res.status(500).json({ error: normalizeKnownError(error) });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const parsed = productSchema.parse(req.body) satisfies ProductPayload;
    await createProduct(parsed);
    const snapshot = await getSnapshot();
    broadcast({ type: "state.snapshot", snapshot });
    res.status(201).json({ snapshot });
  } catch (error) {
    const message = normalizeKnownError(error);
    const status = error instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

app.post("/api/products/batch", async (req, res) => {
  try {
    const parsed = productsBatchSchema.parse(req.body);
    await createProductsBatch(parsed.products as ProductPayload[]);
    const snapshot = await getSnapshot();
    broadcast({ type: "state.snapshot", snapshot });
    res.status(201).json({ snapshot });
  } catch (error) {
    const message = normalizeKnownError(error);
    const status = error instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

app.put("/api/products/:productId", async (req, res) => {
  try {
    const parsed = productSchema.parse(req.body) satisfies ProductPayload;
    await updateProduct(req.params.productId, parsed);
    const snapshot = await getSnapshot();
    broadcast({ type: "state.snapshot", snapshot });
    res.json({ snapshot });
  } catch (error) {
    const message = normalizeKnownError(error);
    const status = error instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

app.post("/api/goals", async (req, res) => {
  try {
    const parsed = goalsSchema.parse(req.body);
    await updateGoals(parsed);
    const snapshot = await getSnapshot();
    broadcast({ type: "state.snapshot", snapshot });
    res.json({ snapshot });
  } catch (error) {
    const message = normalizeKnownError(error);
    const status = error instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

app.post("/api/sales", async (req, res) => {
  try {
    const parsed = saleSchema.parse(req.body);
    const payload = await announceSale(parsed.productId, parsed.quantity);
    broadcast({ type: "sale.event", snapshot: payload.snapshot, event: payload.event });
    res.json(payload);
  } catch (error) {
    const message = normalizeKnownError(error);
    const status = error instanceof z.ZodError ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", async (socket) => {
  clients.add(socket);
  try {
    const snapshot = await getSnapshot();
    sendMessage(socket, { type: "state.snapshot", snapshot });
  } catch {
    sendMessage(socket, {
      type: "state.snapshot",
      snapshot: {
        products: [],
        goals: { month: 0, week: 0, fortnight: 0 },
        totals: { month: 0, week: 0, fortnight: 0 },
        kpis: { goalsHit: 0, goalsFailed: 0, totalMeasuredSales: 0 },
        charts: { dailySales: [], monthlySales: [] },
        hotRelaunches: [],
        recentSales: [],
        generatedAt: new Date().toISOString()
      }
    });
  }

  socket.on("close", () => {
    clients.delete(socket);
  });
});

async function bootstrap() {
  await ensureGoalSeed();
  const port = Number(process.env.PORT ?? 4000);
  server.listen(port, () => {
    console.log(`GoalControl API rodando em http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Erro ao iniciar servidor:", error);
  process.exit(1);
});
