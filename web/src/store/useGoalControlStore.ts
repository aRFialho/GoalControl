import { create } from "zustand";
import {
  announceSale as apiAnnounceSale,
  cancelSale as apiCancelSale,
  createProduct as apiCreateProduct,
  createProductsBatch as apiCreateProductsBatch,
  deleteProduct as apiDeleteProduct,
  fetchSnapshot,
  getApiBase,
  saveGoals as apiSaveGoals,
  updateProduct as apiUpdateProduct
} from "../lib/api";
import {
  DashboardSnapshot,
  Goals,
  ProductPayload,
  SaleEvent,
  WsMessage
} from "../lib/types";

type ConnectionStatus = "connecting" | "online" | "offline";

interface GoalControlState {
  snapshot: DashboardSnapshot | null;
  lastSaleEvent: SaleEvent | null;
  connectionStatus: ConnectionStatus;
  errorMessage: string | null;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  silentRefresh: () => Promise<void>;
  createProduct: (payload: ProductPayload) => Promise<void>;
  createProductsBatch: (payloads: ProductPayload[]) => Promise<void>;
  updateProduct: (productId: string, payload: ProductPayload) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  saveGoals: (goals: Goals) => Promise<void>;
  announceSale: (productId: string, quantity: number) => Promise<void>;
  cancelSale: (saleId: number) => Promise<void>;
  clearError: () => void;
}

let socket: WebSocket | null = null;
let reconnectTimer: number | null = null;
let hasInitialized = false;

const apiBase = getApiBase();
const wsBase = (import.meta.env.VITE_WS_URL ?? apiBase.replace(/^http/, "ws")).replace(/\/$/, "");
const wsUrl = `${wsBase}/ws`;

function connectSocket(set: (partial: Partial<GoalControlState>) => void) {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  set({ connectionStatus: "connecting" });
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    set({ connectionStatus: "online" });
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as WsMessage;
      if (message.type === "state.snapshot") {
        set({ snapshot: message.snapshot });
      } else {
        set({
          snapshot: message.snapshot,
          lastSaleEvent: message.event
        });
      }
    } catch {
      set({ errorMessage: "Mensagem inválida recebida do WebSocket." });
    }
  };

  socket.onerror = () => {
    socket?.close();
  };

  socket.onclose = () => {
    set({ connectionStatus: "offline" });
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
    }
    reconnectTimer = window.setTimeout(() => connectSocket(set), 1600);
  };
}

export const useGoalControlStore = create<GoalControlState>((set, get) => ({
  snapshot: null,
  lastSaleEvent: null,
  connectionStatus: "offline",
  errorMessage: null,

  init: async () => {
    if (hasInitialized) {
      return;
    }
    hasInitialized = true;

    try {
      const snapshot = await fetchSnapshot();
      set({ snapshot, errorMessage: null });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Falha ao carregar dados iniciais."
      });
    }

    connectSocket(set);
  },

  refresh: async () => {
    try {
      const snapshot = await fetchSnapshot();
      set({ snapshot, errorMessage: null });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Falha ao atualizar dashboard."
      });
    }
  },

  silentRefresh: async () => {
    try {
      const snapshot = await fetchSnapshot();
      set({ snapshot });
    } catch {
      // Silencioso por design: usado como keep-alive e refresh em background.
    }
  },

  createProduct: async (payload) => {
    try {
      const snapshot = await apiCreateProduct(payload);
      set({ snapshot, errorMessage: null });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Não foi possível criar produto."
      });
      throw error;
    }
  },

  createProductsBatch: async (payloads) => {
    try {
      const snapshot = await apiCreateProductsBatch(payloads);
      set({ snapshot, errorMessage: null });
    } catch (error) {
      set({
        errorMessage:
          error instanceof Error ? error.message : "Nao foi possivel criar produtos em lote."
      });
      throw error;
    }
  },

  updateProduct: async (productId, payload) => {
    try {
      const snapshot = await apiUpdateProduct(productId, payload);
      set({ snapshot, errorMessage: null });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Não foi possível atualizar produto."
      });
      throw error;
    }
  },

  deleteProduct: async (productId) => {
    try {
      const snapshot = await apiDeleteProduct(productId);
      set({ snapshot, errorMessage: null });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Nao foi possivel excluir produto."
      });
      throw error;
    }
  },

  saveGoals: async (goals) => {
    try {
      const snapshot = await apiSaveGoals(goals);
      set({ snapshot, errorMessage: null });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Não foi possível salvar metas."
      });
      throw error;
    }
  },

  announceSale: async (productId, quantity) => {
    try {
      const response = await apiAnnounceSale(productId, quantity);
      set({
        snapshot: response.snapshot,
        lastSaleEvent: response.event,
        errorMessage: null
      });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Não foi possível anunciar venda."
      });
      throw error;
    }
  },

  cancelSale: async (saleId) => {
    try {
      const snapshot = await apiCancelSale(saleId);
      set({ snapshot, errorMessage: null });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Nao foi possivel cancelar venda."
      });
      throw error;
    }
  },

  clearError: () => {
    if (get().errorMessage) {
      set({ errorMessage: null });
    }
  }
}));
