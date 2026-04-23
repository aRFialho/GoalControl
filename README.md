# GoalControl

Sistema full stack com UX gamificada para metas e vendas.

## Stack

- Frontend: React + Vite + Tailwind + Zustand
- Backend: Node.js + Express + WebSocket (`ws`) + PostgreSQL
- Banco: migracoes SQL em `migrates/`

## Como rodar local

1. Instalar dependencias

```bash
npm install
```

2. Aplicar migracoes

```bash
npm run migrate:deploy
```

3. Subir backend + frontend em dev

```bash
npm run dev
```

## Endpoints principais

- `GET /api/health`
- `GET /api/state`
- `POST /api/products`
- `POST /api/products/batch`
- `PUT /api/products/:productId`
- `DELETE /api/products/:productId`
- `POST /api/sales`
- `POST /api/sales/:saleId/cancel`
- `POST /api/goals`
- `WS /ws`

## Render (unico Web Service)

Com a configuracao atual, o backend serve o frontend buildado (`web/dist`) no mesmo processo.
Tambem existe um blueprint pronto em `render.yaml`.

- Service Type: `Web Service`
- Root Directory: `/`

### Build Command

```bash
npm ci --include=dev && npm run build && npm run migrate:deploy
```

### Start Command

```bash
npm start
```

### Environment Variables

- `DATABASE_URL` = string de conexao do Postgres
- `NODE_ENV` = `production`

Opcional:
- `VITE_API_URL` (normalmente nao precisa em single service)
- `VITE_WS_URL` (normalmente nao precisa em single service)

Observacao:
- Em producao sem `VITE_API_URL`, o frontend usa a mesma origem do deploy.
- Isso permite API e WebSocket no mesmo dominio do Render.
