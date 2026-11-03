# api-restful-favoritos

[![CI](https://github.com/carlosalbertoxw/Api-restful-favoritos/actions/workflows/ci.yml/badge.svg)](https://github.com/carlosalbertoxw/Api-restful-favoritos/actions/workflows/ci.yml)

API RESTful para guardar páginas favoritas (marcadores), construida con **Node.js**, **Express 5**, **MongoDB** (Mongoose 9) y **zod 4**.

Es un ejercicio de ejemplo: no tiene autenticación ni límite de peticiones, así que no debe publicarse tal cual en internet.

## Ejecución

En ambos casos la API queda en `http://localhost:5000`.

### Con Docker

Solo requiere Docker con Compose v2, y que los puertos `5000` y `27017` estén libres.

```bash
docker compose up -d --build --wait   # o: npm run docker:up
curl http://localhost:5000/health/ready
docker compose logs -f api            # o: npm run docker:logs
docker compose down                   # o: npm run docker:down
```

MongoDB solo se publica en `127.0.0.1` y sus datos se conservan en el volumen `mongo-data`.

> En Windows PowerShell 5.1, `curl` es un alias de `Invoke-WebRequest`; usa `curl.exe` para que los ejemplos funcionen tal cual.

> **Si ya tenías datos de MongoDB 8:** MongoDB 9 abre sin problema un volumen creado con la versión 8.3 y conserva sus datos. Con una versión anterior puede no arrancar; en ese caso, lo más simple en un ejercicio es recrearlo con `docker compose down -v`, que **borra sus datos**.

### Con Node local

Requiere Node.js >= 24 y MongoDB, local o en un contenedor (`npm run db:up`).

```bash
npm install
cp .env.example .env   # en Windows (PowerShell): Copy-Item .env.example .env
npm run dev            # recarga automática; en producción: npm start
```

## Variables de entorno

Se leen del archivo `.env` (o `.env.test` en las pruebas) si existe, o del entorno del sistema.

| Variable      | Descripción                                         | Por defecto                           |
| ------------- | --------------------------------------------------- | ------------------------------------- |
| `PORT`        | Puerto del servidor                                 | `5000`                                |
| `MONGODB_URI` | Cadena de conexión a MongoDB                        | `mongodb://127.0.0.1:27017/bookmarks` |
| `CORS_ORIGIN` | Orígenes permitidos: `*` o lista separada por comas | `*`                                   |
| `NODE_ENV`    | `production` usa logs `combined`; `test` los desactiva | `development`                      |

Con Docker, `docker-compose.yml` fija `MONGODB_URI` y solo toma `CORS_ORIGIN` de tu entorno o de `.env`. Para cambiar el puerto publicado, edita `ports` (por ejemplo, `'8080:5000'`).

## API

El contrato completo está en **Swagger UI** (`/docs`) y en **OpenAPI 3.1** (`/openapi.json`). Las reglas de entrada de la especificación se generan desde los esquemas de zod de [`src/validation/favorite.schema.js`](src/validation/favorite.schema.js); los endpoints se describen en [`src/docs/openapi.js`](src/docs/openapi.js).

| Método   | Ruta                 | Descripción                                 | Éxito |
| -------- | -------------------- | ------------------------------------------- | ----- |
| `GET`    | `/api/favoritos`     | Lista del más reciente al más antiguo; `?limit=` (1–100, por defecto 100) y `?skip=` | `200` |
| `POST`   | `/api/favoritos`     | Crea un marcador                            | `201` |
| `GET`    | `/api/favoritos/:id` | Obtiene un marcador                         | `200` |
| `PATCH`  | `/api/favoritos/:id` | Actualiza los campos enviados               | `200` |
| `DELETE` | `/api/favoritos/:id` | Elimina un marcador                         | `204` |
| `GET`    | `/health`            | Liveness: no consulta dependencias          | `200` |
| `GET`    | `/health/ready`      | Readiness: ping a MongoDB (límite de 2 s)   | `200` o `503` |

Solo se aceptan URLs `http` y `https`, para que ningún cliente que muestre los enlaces quede expuesto a XSS con esquemas como `javascript:`.

```bash
curl -X POST http://localhost:5000/api/favoritos \
  -H "Content-Type: application/json" \
  -d '{"title": "Google", "description": "Buscador", "url": "https://google.com"}'
```

Los errores responden JSON con un campo `message` y, en los de validación, con el detalle en `errors`.

## Pruebas

```bash
npm run lint              # ESLint
npm run test:unit         # pruebas unitarias (no necesitan MongoDB)
npm run test:integration  # pruebas de integración (necesitan MongoDB)
npm test                  # todas las pruebas
npm run test:coverage     # todas, con umbral mínimo de cobertura
```

Las de integración usan por defecto la base `bookmarks_test` en `127.0.0.1:27017` y la eliminan al terminar. Para usar otra, define `MONGODB_URI` o crea un archivo `.env.test`. Como protección, las pruebas se detienen antes de conectar si el nombre de la base no termina en `_test`. Si no existe `.env.test`, Node muestra `.env.test not found. Continuing without it.`; es solo informativo.

El workflow de [CI](.github/workflows/ci.yml) ejecuta el linter, las pruebas en Node 24 y 26, la cobertura contra MongoDB, una prueba de humo sobre la imagen Docker y `npm audit`. Dependabot propone las actualizaciones cada semana.

`overrides` en `package.json` fuerza `minimatch` 11 porque ESLint aún depende de una versión con una vulnerabilidad conocida (GHSA-g3hv-75wg-m249). Quítalo cuando ESLint la actualice.

## Estructura

```
src/
├── app.js          # Configuración de Express (middlewares y rutas)
├── server.js       # Arranque y apagado ordenado
├── config.js       # Configuración por variables de entorno
├── db.js           # Conexión a MongoDB
├── controllers/    # Lógica de los endpoints
├── docs/           # Especificación OpenAPI
├── middleware/     # Manejo de errores y 404
├── models/         # Esquema de Mongoose
├── routes/         # Definición de rutas
├── utils/          # ApiError
└── validation/     # Esquemas de zod: reglas de entrada de la API
tests/
├── setup.js        # Prepara el entorno de pruebas
├── unit/           # Pruebas unitarias (node:test)
└── integration/    # Pruebas de integración (supertest + MongoDB)
```

## Licencia

[ISC](LICENSE)
