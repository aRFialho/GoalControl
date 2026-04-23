import { DashboardSnapshot, Goals, ProductPayload, SaleEvent } from "./types";

const runtimeOrigin =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:4000";
const defaultApiBase = import.meta.env.DEV ? "http://localhost:4000" : runtimeOrigin;
const API_BASE = (import.meta.env.VITE_API_URL ?? defaultApiBase).replace(/\/$/, "");

interface SnapshotResponse {
  snapshot: DashboardSnapshot;
}

interface SaleResponse {
  snapshot: DashboardSnapshot;
  event: SaleEvent;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    const message = errorBody?.error ?? "Erro de comunicacao com o servidor.";
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function getApiBase(): string {
  return API_BASE;
}

export async function fetchSnapshot(): Promise<DashboardSnapshot> {
  const payload = await request<SnapshotResponse>("/api/state");
  return payload.snapshot;
}

export async function createProduct(payload: ProductPayload): Promise<DashboardSnapshot> {
  const result = await request<SnapshotResponse>("/api/products", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return result.snapshot;
}

export async function createProductsBatch(
  payloads: ProductPayload[]
): Promise<DashboardSnapshot> {
  const result = await request<SnapshotResponse>("/api/products/batch", {
    method: "POST",
    body: JSON.stringify({ products: payloads })
  });
  return result.snapshot;
}

export async function updateProduct(
  productId: string,
  payload: ProductPayload
): Promise<DashboardSnapshot> {
  const result = await request<SnapshotResponse>(`/api/products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return result.snapshot;
}

export async function deleteProduct(productId: string): Promise<DashboardSnapshot> {
  const result = await request<SnapshotResponse>(`/api/products/${productId}`, {
    method: "DELETE"
  });
  return result.snapshot;
}

export async function saveGoals(payload: Goals): Promise<DashboardSnapshot> {
  const result = await request<SnapshotResponse>("/api/goals", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return result.snapshot;
}

export async function announceSale(
  productId: string,
  quantity: number
): Promise<SaleResponse> {
  return request<SaleResponse>("/api/sales", {
    method: "POST",
    body: JSON.stringify({ productId, quantity })
  });
}

export async function cancelSale(saleId: number): Promise<DashboardSnapshot> {
  const result = await request<SnapshotResponse>(`/api/sales/${saleId}/cancel`, {
    method: "POST"
  });
  return result.snapshot;
}
