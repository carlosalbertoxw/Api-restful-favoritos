# api-restful-favoritos

[![CI](https://github.com/carlosalbertoxw/Api-restful-favoritos/actions/workflows/ci.yml/badge.svg)](https://github.com/carlosalbertoxw/Api-restful-favoritos/actions/workflows/ci.yml)

API RESTful para guardar páginas favoritas (marcadores), construida con **Node.js**, **Express 5**, **MongoDB** (Mongoose 9) y **zod 4**.

Es un ejercicio de ejemplo: no tiene autenticación, así que no debe publicarse tal cual en internet. Por eso, con Docker, la API y MongoDB solo se publican en `127.0.0.1`.

**Convención de nombres:** el código y el contrato de la API están en inglés (`/api/v1/bookmarks`, `{ bookmark }`); los mensajes para las personas, en español.

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

La API y MongoDB solo se publican en `127.0.0.1`, y los datos se conservan en el volumen `api-restful-favoritos_mongo-data`. El frontend [Favoritos](https://github.com/carlosalbertoxw/Favoritos) puede levantar este mismo `docker-compose.yml` junto con él (ver su README).

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

Se leen del archivo `.env` (o `.env.test` en las pruebas) si existe, o del entorno del sistema. Se validan al arrancar: un valor inválido (por ejemplo, `PORT=abc`) detiene el servidor con un mensaje que indica cuál es.

| Variable                | Descripción                                                                       | Por defecto                           |
| ----------------------- | --------------------------------------------------------------------------------- | ------------------------------------- |
| `PORT`                  | Puerto del servidor                                                               | `5000`                                |
| `MONGODB_URI`           | Cadena de conexión a MongoDB                                                      | `mongodb://127.0.0.1:27017/bookmarks` |
| `CORS_ORIGIN`           | Orígenes permitidos: `*` o lista separada por comas                               | sin CORS                              |
| `RATE_LIMIT_PER_MINUTE` | Peticiones por minuto y por IP en `/api`                                          | `100`                                 |
| `TRUST_PROXY`           | Proxies de confianza (`trust proxy` de Express) para leer la IP real del cliente | ninguno                               |
| `NODE_ENV`              | `production`: logs JSON; `development`: logs legibles; `test`: sin logs           | `development`                         |

El frontend no necesita CORS porque usa la API desde su mismo origen (con el proxy de nginx o de `ng serve`). Define `CORS_ORIGIN` solo si otro origen la consume desde el navegador.

Con Docker, `docker-compose.yml` fija `MONGODB_URI` y `TRUST_PROXY=uniquelocal` (confía en `X-Forwarded-For` solo desde la red privada de Docker), y toma `CORS_ORIGIN` y `RATE_LIMIT_PER_MINUTE` de tu entorno o de `.env`. Para cambiar el puerto publicado, edita `ports` (por ejemplo, `'127.0.0.1:8080:5000'`).

## API

El contrato completo está en **Swagger UI** (`/docs`) y en **OpenAPI 3.1** (`/openapi.json`). Las reglas de entrada de la especificación se generan desde los esquemas de zod de [`src/validation/bookmark.schema.js`](src/validation/bookmark.schema.js); los endpoints se describen en [`src/docs/openapi.js`](src/docs/openapi.js).

| Método   | Ruta                    | Descripción                                                                                                             | Éxito         |
| -------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------- |
| `GET`    | `/api/v1/bookmarks`     | Lista del más reciente al más antiguo; `?limit=` (1–100, por defecto 100) y `?skip=`. Responde `{ bookmarks, hasMore }` | `200`         |
| `POST`   | `/api/v1/bookmarks`     | Crea un marcador; responde `{ bookmark }`                                                                               | `201`         |
| `GET`    | `/api/v1/bookmarks/:id` | Obtiene un marcador                                                                                                     | `200`         |
| `PATCH`  | `/api/v1/bookmarks/:id` | Actualiza los campos enviados                                                                                           | `200`         |
| `DELETE` | `/api/v1/bookmarks/:id` | Elimina un marcador                                                                                                     | `204`         |
| `GET`    | `/health`               | Liveness: no consulta dependencias                                                                                      | `200`         |
| `GET`    | `/health/ready`         | Readiness: ping a MongoDB (límite de 2 s)                                                                               | `200` o `503` |

Solo se aceptan URLs `http` y `https`, para que ningún cliente que muestre los enlaces quede expuesto a XSS con esquemas como `javascript:`.

```bash
curl -X POST http://localhost:5000/api/v1/bookmarks \
  -H "Content-Type: application/json" \
  -d '{"title": "Google", "description": "Buscador", "url": "https://google.com"}'
```

Los errores responden JSON con un campo `message` y, en los de validación, con el detalle en `errors`. Al superar el límite de peticiones, `/api` responde `429` con las cabeceras `RateLimit` y `RateLimit-Policy`.

Cada respuesta incluye la cabecera `X-Request-Id`, que también aparece en los logs de esa petición. Si un proxy envía su propio `X-Request-Id` (como el nginx del frontend), se reutiliza siempre que tenga un formato seguro (hasta 64 letras, números, `-` o `_`); si no, se genera uno nuevo. Los logs de cada petición registran solo el id, el método, la URL, la IP y el status, nunca las cabeceras.

### Cambios respecto a la versión 3

La versión 4 cambia el contrato: las rutas pasan de `/api/favoritos` a `/api/v1/bookmarks`, las respuestas usan `bookmark` y `bookmarks` en lugar de `favorito` y `favoritos`, y el listado añade `hasMore`. Requiere la versión del frontend Favoritos que usa `/api/v1`.

Los marcadores se guardan ahora en la colección `bookmarks` (antes, `favorites`). Para conservar los datos de una versión anterior, renómbrala una vez:

```bash
docker compose exec mongo mongosh bookmarks --quiet --eval 'db.favorites.renameCollection("bookmarks")'
```

## Pruebas

```bash
npm run lint              # ESLint
npm run test:unit         # pruebas unitarias (no necesitan MongoDB)
npm run test:integration  # pruebas de integración (necesitan MongoDB)
npm test                  # todas las pruebas
npm run test:coverage     # todas, con umbral mínimo de cobertura
```

Las de integración usan por defecto la base `bookmarks_test` en `127.0.0.1:27017` y la eliminan al terminar. Para usar otra, define `MONGODB_URI` o crea un archivo `.env.test`. Como protección, las pruebas se detienen antes de conectar si el nombre de la base no termina en `_test`. Si no existe `.env.test`, Node muestra `.env.test not found. Continuing without it.`; es solo informativo.

El workflow de [CI](.github/workflows/ci.yml) ejecuta el linter, las pruebas en Node 24 y 26, la cobertura contra MongoDB, una prueba de humo sobre la imagen Docker, el escaneo de la imagen con Trivy y `npm audit`.

Dependabot propone las actualizaciones cada semana: los parches y versiones menores de npm van juntos en un solo PR y se integran solos cuando el CI pasa; las versiones mayores quedan para revisión manual.

La rama `master` solo acepta cambios por PR con el CI en verde. GitHub ejecuta además CodeQL y el escaneo de secretos, que bloquea los push con credenciales.

## Estructura

```
src/
├── app.js          # Configuración de Express (middlewares y rutas)
├── server.js       # Arranque y apagado ordenado
├── config.js       # Variables de entorno, validadas con zod
├── db.js           # Conexión a MongoDB
├── logger.js       # Logs con pino y X-Request-Id
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
