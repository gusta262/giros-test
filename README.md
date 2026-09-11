# giros-test — CEPs próximos

API REST em Node.js/TypeScript que recebe um CEP e devolve todos os CEPs num raio de 1km, cada um com a distância até o CEP de origem.

## Stack

- Node.js + Express
- TypeScript
- MongoDB (Mongoose) — índice geoespacial `2dsphere`
- Redis — cache
- Docker / docker-compose

## Como rodar

### Com Docker (recomendado)

```bash
docker compose up -d
npm install
npm run seed
```

A API sobe em `http://localhost:3000`. O `seed` roda localmente (usa `MONGO_URI=mongodb://localhost:27017` do `.env`, que aponta pra porta publicada pelo container do Mongo) e popula a base geoespacial usada pela busca por raio.

```bash
docker compose build app && docker compose up -d app
```

### Sem Docker

Precisa de um Mongo e um Redis rodando localmente (portas do `.env`).

```bash
npm install
npm run seed
npm run dev
```

## Variáveis de ambiente (`.env`)

```
PORT=3000
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=giros_test
REDIS_URL=redis://localhost:6379
```

## Endpoints

### `GET /cep/ceps-proximos/:cep`

Recebe um CEP (`00000-000` ou `00000000`) e devolve os CEPs num raio de 1km, ordenados por distância.

```bash
curl http://localhost:3000/cep/ceps-proximos/06332190
```

```json
[
  { "cep": "06332240", "distancia_km": 0.13 },
  { "cep": "06331170", "distancia_km": 0.48 },
  { "cep": "06381010", "distancia_km": 0.51 }
]
```

Respostas de erro:

| Situação | Status | Corpo |
|---|---|---|
| CEP com formato inválido | 400 | `{ "message": "CEP inválido. Formato esperado: 00000-000 ou 00000000" }` |
| CEP bem formado mas inexistente no ViaCEP | 404 | `{ "message": "CEP não encontrado" }` |
| Geocoding não encontrou coordenadas pro endereço | 404 | `{ "message": "Coordenadas não encontradas para o CEP informado" }` |
| ViaCEP/Nominatim indisponível ou erro inesperado | 500 | `{ "message": "Erro ao consultar os ceps próximos" }` |

### `DELETE /cep/cache/:cep`

Limpa o cache da busca por raio de um CEP específico. Não afeta o cache de geocoding (esse expira sozinho, tem TTL próprio de 6 meses e não tem endpoint de invalidação manual).

### `DELETE /cep/cache`

Limpa todo o cache de busca por raio — endpoint auxiliar pra debug/administração, útil sobretudo logo após rodar `npm run seed`.

## Estratégia: como localizar CEPs num raio de 1km

A estratégia escolhida foi manter uma **base geoespacial própria no MongoDB**, alimentada previamente, e usar o agregador `$geoNear` (índice `2dsphere`) pra resolver busca por raio + cálculo de distância numa única query:

```js
CepModel.aggregate([
  {
    $geoNear: {
      near: { type: 'Point', coordinates: [lng, lat] },
      distanceField: 'distance_m',
      maxDistance: 1000,
      spherical: true,
    },
  },
]);
```

O `$geoNear` já devolve os documentos ordenados por distância crescente.

### De onde vêm os dados da base

1. Baixei o dump de CEPs de SP do [CEP Aberto](https://www.cepaberto.com/) (`sp.cepaberto_parte_1.csv`) — contém `cep, logradouro, complemento, bairro, cidade_id, estado_id`, mas **sem lat/lng** (coordenadas só vêm na consulta individual da API deles, que exige token).
2. Filtrei pelo `cidade_id` de Carapicuíba (2098) → 1.964 CEPs.
3. Tirei uma amostra espaçada (1 a cada 20 linhas, ~98 CEPs) pra ter cobertura espalhada pela cidade em vez de concentrada num bairro só.
4. Geocodifiquei cada endereço via Nominatim (OpenStreetMap), usando busca estruturada (`street`, `city`, `state`, `country`) respeitando o rate limit de ~1 req/s. 72 de 98 endereços retornaram coordenada.
5. O resultado (`carapicuiba-sample.csv`) é lido pelo script `npm run seed` ([src/scripts/seedCeps.ts](src/scripts/seedCeps.ts)), que faz upsert no Mongo com o campo GeoJSON `location`.

### Trade-off: precisão vs. performance

- **A favor da abordagem**: busca por raio é uma query indexada (`2dsphere`) — rápida e escalável, independente de quantos CEPs existam na base. Cálculo de distância e ordenação saem da mesma query, sem pós-processamento em memória.
- **Contra**: a base só cobre os CEPs que foram previamente semeados (aqui, uma amostra de Carapicuíba) — CEPs de outras cidades, ou mesmo ruas de Carapicuíba fora da amostra, não aparecem como "vizinhos" mesmo estando fisicamente a menos de 1km. Cobertura nacional completa exigiria geocodificar centenas de milhares de endereços, inviável no rate limit gratuito do Nominatim (e a política de uso deles desaconselha geocoding em massa).
- Alternativa descartada: calcular Haversine manualmente contra todos os documentos, em vez de usar índice geoespacial — mais simples de entender, mas não escala e não aproveita nenhum índice do banco.
- Pra um cenário de produção real, a base cresceria organicamente (cada CEP novo consultado e geocodificado seria persistido) ou usaria um dataset completo/pago de CEPs geolocalizados.

## Cache

Dois caches Redis, com TTLs diferentes:

| Cache | Chave | TTL | Justificativa |
|---|---|---|---|
| Geocoding (CEP → lat/lng) | `cep:geocoding:<cep>` | 6 meses | Endereço e coordenadas de um CEP praticamente não mudam nesse intervalo — TTL bem longo reduz ao máximo as chamadas ao Nominatim (que tem rate limit), com risco desprezível de servir dado desatualizado. |
| Busca por raio (CEP origem → lista de vizinhos) | `cep:search:nearby:<cep>` | 30 dias | A base geoespacial só muda por ação manual (`npm run seed`), não automaticamente — então um TTL curto não traria benefício de "frescor" por si só. Fica menor que o de geocoding porque é o cache mais fácil de invalidar manualmente (endpoint abaixo) e o mais afetado quando a base ganha novos CEPs. |
