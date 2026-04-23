import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { DashboardSnapshot, Product, ProductPayload } from "../lib/types";
import { useGoalControlStore } from "../store/useGoalControlStore";

interface AdminPanelProps {
  snapshot: DashboardSnapshot;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler o arquivo da imagem."));
    reader.readAsDataURL(file);
  });
}

function ProductEditor({
  product,
  onSave,
  onDelete
}: {
  product: Product;
  onSave: (productId: string, payload: ProductPayload) => Promise<void>;
  onDelete: (productId: string) => Promise<void>;
}) {
  const [form, setForm] = useState<ProductPayload>({
    type: product.type,
    imageUrl: product.imageUrl,
    name: product.name,
    reference: product.reference,
    stock: product.stock
  });
  const [saving, setSaving] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setForm({
      type: product.type,
      imageUrl: product.imageUrl,
      name: product.name,
      reference: product.reference,
      stock: product.stock
    });
  }, [product]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(product.id, form);
    } finally {
      setSaving(false);
    }
  }

  async function onImageFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setLoadingFile(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((prev) => ({ ...prev, imageUrl: dataUrl }));
    } finally {
      setLoadingFile(false);
      e.target.value = "";
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Excluir ${product.name} e todo o historico de vendas desse produto?`
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    try {
      await onDelete(product.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="glass-card grid gap-3 rounded-2xl border border-white/70 p-4 md:grid-cols-[96px,1fr]"
    >
      <img
        src={form.imageUrl}
        alt={form.name}
        className="h-24 w-24 rounded-xl object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src =
            "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=300&q=80";
        }}
      />

      <div className="grid gap-2">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nome do produto"
            required
          />
          <input
            className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            value={form.reference}
            onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
            placeholder="Referência"
            required
          />
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr,140px,120px]">
          <input
            className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            value={form.imageUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
            placeholder="URL da imagem"
            required
          />
          <select
            className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            value={form.type}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                type: e.target.value as ProductPayload["type"]
              }))
            }
          >
            <option value="OUTLET">OUTLET</option>
            <option value="RELAUNCH">RELAUNCH</option>
          </select>
          <input
            className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            type="number"
            min={0}
            value={form.stock}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, stock: Number(e.target.value) || 0 }))
            }
          />
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr,180px]">
          <label className="text-xs font-medium text-ink/75">
            Imagem por arquivo
            <input
              type="file"
              accept="image/*"
              onChange={onImageFileChange}
              className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-2 py-2 text-xs"
            />
          </label>
          <div className="flex items-end">
            {loadingFile && (
              <p className="text-xs font-semibold text-ink/70">Carregando imagem...</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving || deleting}
            className="w-fit rounded-xl bg-cyanpop px-4 py-2 text-sm font-semibold text-ink transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar Produto"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="w-fit rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? "Excluindo..." : "Excluir Produto + Historico"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function AdminPanel({ snapshot }: AdminPanelProps) {
  const createProduct = useGoalControlStore((state) => state.createProduct);
  const createProductsBatch = useGoalControlStore((state) => state.createProductsBatch);
  const updateProduct = useGoalControlStore((state) => state.updateProduct);
  const deleteProduct = useGoalControlStore((state) => state.deleteProduct);
  const saveGoals = useGoalControlStore((state) => state.saveGoals);
  const announceSale = useGoalControlStore((state) => state.announceSale);
  const cancelSale = useGoalControlStore((state) => state.cancelSale);

  const [creating, setCreating] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [selling, setSelling] = useState(false);
  const [cancelingSale, setCancelingSale] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchSuccess, setBatchSuccess] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState<ProductPayload>({
    type: "OUTLET",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    name: "",
    reference: "",
    stock: 0
  });
  const [batchType, setBatchType] = useState<ProductPayload["type"]>("OUTLET");
  const [batchImageUrl, setBatchImageUrl] = useState(
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80"
  );
  const [batchInput, setBatchInput] = useState("");
  const [creatingImageFromFile, setCreatingImageFromFile] = useState(false);
  const [batchImageLoading, setBatchImageLoading] = useState(false);

  const [saleProductId, setSaleProductId] = useState<string>(
    snapshot.products[0]?.id ?? ""
  );
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [cancelSaleId, setCancelSaleId] = useState<number | null>(
    snapshot.recentSales[0]?.id ?? null
  );

  const [goalsForm, setGoalsForm] = useState({
    month: snapshot.goals.month,
    week: snapshot.goals.week,
    fortnight: snapshot.goals.fortnight
  });

  useEffect(() => {
    if (!snapshot.products.length) {
      setSaleProductId("");
      return;
    }

    const exists = snapshot.products.some((product) => product.id === saleProductId);
    if (!exists) {
      setSaleProductId(snapshot.products[0].id);
    }
  }, [snapshot.products, saleProductId]);

  useEffect(() => {
    setGoalsForm({
      month: snapshot.goals.month,
      week: snapshot.goals.week,
      fortnight: snapshot.goals.fortnight
    });
  }, [snapshot.goals]);

  useEffect(() => {
    if (!snapshot.recentSales.length) {
      setCancelSaleId(null);
      return;
    }
    const exists = snapshot.recentSales.some((sale) => sale.id === cancelSaleId);
    if (!exists) {
      setCancelSaleId(snapshot.recentSales[0].id);
    }
  }, [snapshot.recentSales, cancelSaleId]);

  const outletProducts = useMemo(
    () => snapshot.products.filter((product) => product.type === "OUTLET"),
    [snapshot.products]
  );
  const relaunchProducts = useMemo(
    () => snapshot.products.filter((product) => product.type === "RELAUNCH"),
    [snapshot.products]
  );

  async function submitProduct(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createProduct(newProduct);
      setNewProduct((prev) => ({
        ...prev,
        name: "",
        reference: "",
        stock: 0
      }));
    } finally {
      setCreating(false);
    }
  }

  async function onCreateImageFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setCreatingImageFromFile(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setNewProduct((prev) => ({ ...prev, imageUrl: dataUrl }));
    } finally {
      setCreatingImageFromFile(false);
      e.target.value = "";
    }
  }

  async function onBatchImageFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setBatchImageLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setBatchImageUrl(dataUrl);
    } finally {
      setBatchImageLoading(false);
      e.target.value = "";
    }
  }

  async function submitBatchProducts(e: FormEvent) {
    e.preventDefault();
    setBatchError(null);
    setBatchSuccess(null);

    const lines = batchInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setBatchError("Preencha ao menos 1 linha no cadastro em lote.");
      return;
    }

    const parsedProducts: ProductPayload[] = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const parts = line.split("|").map((part) => part.trim());
      if (parts.length < 3) {
        setBatchError(
          `Linha ${index + 1} invalida. Use: Nome|Referencia|Estoque|Imagem(opcional)`
        );
        return;
      }

      const [name, reference, stockRaw, imageFromLine] = parts;
      const stock = Number(stockRaw);
      if (!Number.isInteger(stock) || stock < 0) {
        setBatchError(`Linha ${index + 1}: estoque deve ser inteiro >= 0.`);
        return;
      }

      parsedProducts.push({
        type: batchType,
        name,
        reference,
        stock,
        imageUrl: imageFromLine || batchImageUrl
      });
    }

    setCreatingBatch(true);
    try {
      await createProductsBatch(parsedProducts);
      setBatchInput("");
      setBatchSuccess(`${parsedProducts.length} produto(s) adicionados com sucesso.`);
    } finally {
      setCreatingBatch(false);
    }
  }

  async function submitSale(e: FormEvent) {
    e.preventDefault();
    if (!saleProductId) {
      return;
    }
    setSelling(true);
    try {
      await announceSale(saleProductId, saleQuantity);
      setSaleQuantity(1);
    } finally {
      setSelling(false);
    }
  }

  async function submitGoals(e: FormEvent) {
    e.preventDefault();
    setSavingGoals(true);
    try {
      await saveGoals(goalsForm);
    } finally {
      setSavingGoals(false);
    }
  }

  async function submitCancelSale(e: FormEvent) {
    e.preventDefault();
    if (!cancelSaleId) {
      return;
    }

    const selectedSale = snapshot.recentSales.find((sale) => sale.id === cancelSaleId);
    const confirmed = window.confirm(
      selectedSale
        ? `Cancelar venda de ${selectedSale.productName} (${selectedSale.quantity} un.)?`
        : "Cancelar esta venda?"
    );

    if (!confirmed) {
      return;
    }

    setCancelingSale(true);
    try {
      await cancelSale(cancelSaleId);
    } finally {
      setCancelingSale(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-5">
      <div className="glass-card rounded-2xl border border-white/70 p-4">
        <h3 className="font-display text-lg text-ink">Produtos</h3>
        <p className="mb-3 text-sm text-ink/70">
          Cadastre itens de Outlet e Relaunch com estoque em tempo real.
        </p>
        <form onSubmit={submitProduct} className="grid gap-2 md:grid-cols-5">
          <select
            value={newProduct.type}
            onChange={(e) =>
              setNewProduct((prev) => ({
                ...prev,
                type: e.target.value as ProductPayload["type"]
              }))
            }
            className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          >
            <option value="OUTLET">OUTLET</option>
            <option value="RELAUNCH">RELAUNCH</option>
          </select>
          <input
            value={newProduct.name}
            onChange={(e) =>
              setNewProduct((prev) => ({ ...prev, name: e.target.value }))
            }
            className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            placeholder="Nome"
            required
          />
          <input
            value={newProduct.reference}
            onChange={(e) =>
              setNewProduct((prev) => ({ ...prev, reference: e.target.value }))
            }
            className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            placeholder="Referência"
            required
          />
          <input
            type="number"
            min={0}
            value={newProduct.stock}
            onChange={(e) =>
              setNewProduct((prev) => ({ ...prev, stock: Number(e.target.value) || 0 }))
            }
            className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            placeholder="Estoque"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-candy px-3 py-2 text-sm font-bold text-white shadow-candy transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Criando..." : "Adicionar"}
          </button>
        </form>
        <input
          value={newProduct.imageUrl}
          onChange={(e) =>
            setNewProduct((prev) => ({ ...prev, imageUrl: e.target.value }))
          }
          className="mt-2 w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          placeholder="URL da imagem"
          required
        />
        <div className="mt-2 grid gap-2 md:grid-cols-[1fr,220px]">
          <label className="text-xs font-medium text-ink/75">
            Ou selecionar arquivo
            <input
              type="file"
              accept="image/*"
              onChange={onCreateImageFileChange}
              className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-2 py-2 text-xs"
            />
          </label>
          <div className="flex items-end">
            {creatingImageFromFile && (
              <p className="text-xs font-semibold text-ink/70">Carregando imagem...</p>
            )}
          </div>
        </div>

        <form onSubmit={submitBatchProducts} className="mt-4 rounded-2xl border border-ink/15 bg-white/50 p-3">
          <h4 className="font-display text-base text-ink">Cadastro em lote</h4>
          <p className="mt-1 text-xs text-ink/70">
            Formato por linha: Nome|Referencia|Estoque|Imagem(opcional)
          </p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <select
              value={batchType}
              onChange={(e) => setBatchType(e.target.value as ProductPayload["type"])}
              className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            >
              <option value="OUTLET">OUTLET</option>
              <option value="RELAUNCH">RELAUNCH</option>
            </select>
            <input
              value={batchImageUrl}
              onChange={(e) => setBatchImageUrl(e.target.value)}
              className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
              placeholder="Imagem padrao (opcional por linha)"
              required
            />
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-[1fr,220px]">
            <label className="text-xs font-medium text-ink/75">
              Imagem padrao por arquivo
              <input
                type="file"
                accept="image/*"
                onChange={onBatchImageFileChange}
                className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-2 py-2 text-xs"
              />
            </label>
            <div className="flex items-end">
              {batchImageLoading && (
                <p className="text-xs font-semibold text-ink/70">Carregando imagem...</p>
              )}
            </div>
          </div>
          <textarea
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            className="mt-2 h-32 w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            placeholder={"Camiseta X|REF001|20\nTenis Runner|REF002|8"}
          />
          {batchError && (
            <p className="mt-2 text-xs font-semibold text-red-700">{batchError}</p>
          )}
          {batchSuccess && (
            <p className="mt-2 text-xs font-semibold text-lime-700">{batchSuccess}</p>
          )}
          <button
            type="submit"
            disabled={creatingBatch}
            className="mt-2 rounded-xl bg-ink px-3 py-2 text-sm font-bold text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creatingBatch ? "Adicionando lote..." : "Adicionar em lote"}
          </button>
        </form>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card rounded-2xl border border-white/70 p-4">
          <h4 className="font-display text-base text-ink">Outlet</h4>
          <div className="mt-3 grid gap-3">
            {outletProducts.length === 0 && (
              <p className="text-sm text-ink/60">Nenhum produto de outlet cadastrado.</p>
            )}
            {outletProducts.map((product) => (
              <ProductEditor
                key={product.id}
                product={product}
                onSave={updateProduct}
                onDelete={deleteProduct}
              />
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/70 p-4">
          <h4 className="font-display text-base text-ink">Relaunch</h4>
          <div className="mt-3 grid gap-3">
            {relaunchProducts.length === 0 && (
              <p className="text-sm text-ink/60">Nenhum produto de relaunch cadastrado.</p>
            )}
            {relaunchProducts.map((product) => (
              <ProductEditor
                key={product.id}
                product={product}
                onSave={updateProduct}
                onDelete={deleteProduct}
              />
            ))}
          </div>
        </div>
      </div>

      <form
        onSubmit={submitSale}
        className="glass-card grid gap-2 rounded-2xl border border-white/70 p-4 md:grid-cols-[1fr,120px,170px]"
      >
        <div>
          <h3 className="font-display text-lg text-ink">Controle de Vendas</h3>
          <p className="text-sm text-ink/70">
            Anunciar venda dispara atualização instantânea para todos no DASH.
          </p>
          <select
            value={saleProductId}
            onChange={(e) => setSaleProductId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            disabled={!snapshot.products.length}
          >
            {snapshot.products.length === 0 && (
              <option value="">Cadastre produtos para anunciar venda</option>
            )}
            {snapshot.products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.reference}) - estoque {product.stock}
              </option>
            ))}
          </select>
        </div>
        <label className="text-sm text-ink/80">
          Quantidade
          <input
            type="number"
            min={1}
            value={saleQuantity}
            onChange={(e) => setSaleQuantity(Math.max(1, Number(e.target.value) || 1))}
            className="mt-2 w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={!saleProductId || selling}
          className="self-end rounded-xl bg-lime px-4 py-2 text-sm font-bold text-ink transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {selling ? "Enviando..." : "Anunciar Venda"}
        </button>
      </form>

      <form
        onSubmit={submitCancelSale}
        className="glass-card grid gap-2 rounded-2xl border border-white/70 p-4 md:grid-cols-[1fr,190px]"
      >
        <div>
          <h3 className="font-display text-lg text-ink">Cancelar Venda</h3>
          <p className="text-sm text-ink/70">
            Remove a venda do historico e devolve o estoque do produto.
          </p>
          <select
            value={cancelSaleId ?? ""}
            onChange={(e) => setCancelSaleId(Number(e.target.value) || null)}
            className="mt-2 w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            disabled={!snapshot.recentSales.length}
          >
            {snapshot.recentSales.length === 0 && (
              <option value="">Sem vendas para cancelar</option>
            )}
            {snapshot.recentSales.map((sale) => (
              <option key={sale.id} value={sale.id}>
                #{sale.id} - {sale.productName} ({sale.quantity} un.) em{" "}
                {new Date(sale.createdAt).toLocaleString("pt-BR")}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!cancelSaleId || cancelingSale}
          className="self-end rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cancelingSale ? "Cancelando..." : "Cancelar Venda"}
        </button>
      </form>

      <form onSubmit={submitGoals} className="glass-card rounded-2xl border border-white/70 p-4">
        <h3 className="font-display text-lg text-ink">Configuração de Metas</h3>
        <p className="mb-3 text-sm text-ink/70">
          Defina metas personalizadas por mês, semana e quinzena.
        </p>
        <div className="grid gap-2 md:grid-cols-4">
          <label className="text-sm text-ink/80">
            Mês
            <input
              type="number"
              min={0}
              value={goalsForm.month}
              onChange={(e) =>
                setGoalsForm((prev) => ({ ...prev, month: Number(e.target.value) || 0 }))
              }
              className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-ink/80">
            Semana
            <input
              type="number"
              min={0}
              value={goalsForm.week}
              onChange={(e) =>
                setGoalsForm((prev) => ({ ...prev, week: Number(e.target.value) || 0 }))
              }
              className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-ink/80">
            Quinzena
            <input
              type="number"
              min={0}
              value={goalsForm.fortnight}
              onChange={(e) =>
                setGoalsForm((prev) => ({
                  ...prev,
                  fortnight: Number(e.target.value) || 0
                }))
              }
              className="mt-1 w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={savingGoals}
            className="self-end rounded-xl bg-ink px-4 py-2 text-sm font-bold text-white transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingGoals ? "Salvando..." : "Salvar Metas"}
          </button>
        </div>
      </form>
    </div>
  );
}
