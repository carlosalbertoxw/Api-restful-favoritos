# api-restful-favoritos

[![CI](https://github.com/carlosalbertoxw/Api-restful-favoritos/actions/workflows/ci.yml/badge.svg)](https://github.com/carlosalbertoxw/Api-restful-favoritos/actions/workflows/ci.yml)

API RESTful para guardar páginas favoritas (marcadores), construida con **Node.js**, **Express 5** y **MongoDB** (Mongoose 9).

## Tecnologías

| Paquete                                                   | Uso                                              |
| --------------------------------------------------------- | ------------------------------------------------ |
| [Express 5](https://expressjs.com)                        | Servidor HTTP y enrutamiento                     |
| [Mongoose 9](https://mongoosejs.com)                      | Modelado y acceso a MongoDB                      |
| [zod 4](https://zod.dev)                                  | Validación de las peticiones                     |
| [helmet](https://helmetjs.github.io)                      | Cabeceras de seguridad HTTP                      |
| [cors](https://github.com/expressjs/cors)                 | Control de orígenes permitidos                   |
| [morgan](https://github.com/expressjs/morgan)             | Logs de peticiones (desactivado en pruebas)      |
| [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express) | Documentación interactiva OpenAPI  |
| `node:test` + [supertest](https://github.com/ladjs/supertest) | Pruebas unitarias y de integración           |

## Ejecución

Hay dos formas de levantar el proyecto:

| Opción | Requisitos | Ideal para |
| ------ | ---------- | ---------- |
| [Todo con Docker](#opción-1-todo-con-docker) | Docker con Compose v2 | Probar la API sin instalar Node ni MongoDB |
| [Node local](#opción-2-node-local) | Node.js >= 22.9 y MongoDB (local o con Docker) | Desarrollo con recarga automática y pruebas |

En ambos casos la API queda en `http://localhost:5000` (documentación en `/docs`) y se cierra de forma ordenada, cerrando la conexión a MongoDB, al recibir `SIGINT` o `SIGTERM`.

### Opción 1: todo con Docker

Levanta la API y MongoDB 8 en contenedores. No hace falta `npm install` ni archivo `.env`, pero sí que los puertos `5000` y `27017` estén libres.

```bash
docker compose up -d --build --wait   # o: npm run docker:up
```

- La primera vez descarga las imágenes `mongo:8` y `node:24-alpine` y construye la imagen `api-restful-favoritos`; las siguientes veces reutiliza la caché.
- La API arranca solo cuando MongoDB supera su healthcheck. Con `--wait` el comando no termina hasta que ambos contenedores están sanos (o falla si no lo consiguen).

Para comprobar que todo está listo:

```bash
docker compose ps                              # ambos servicios deben aparecer como "(healthy)"
curl http://localhost:5000/health/ready        # {"status":"ok","checks":{"database":"up"}}
```

```text
NAME              STATUS                    PORTS
favoritos-api     Up 14 seconds (healthy)   0.0.0.0:5000->5000/tcp
favoritos-mongo   Up 21 seconds (healthy)   0.0.0.0:27017->27017/tcp
```

> En Windows PowerShell 5.1, `curl` es un alias de `Invoke-WebRequest`; usa `curl.exe` para que los ejemplos funcionen tal cual.

Otros comandos útiles:

```bash
docker compose logs -f api     # logs de la API (o: npm run docker:logs)
docker compose up -d --build   # reconstruye la imagen tras cambiar el código
docker compose down            # detiene y elimina los contenedores (o: npm run docker:down)
docker compose down -v         # además borra los datos de MongoDB
```

Detalles:

- **Servicios:** `api` (imagen construida con el [`Dockerfile`](Dockerfile), puerto `5000`) y `mongo` (`mongo:8`, puerto `27017`). Dentro de la red de Docker la API se conecta con `mongodb://mongo:27017/bookmarks`.
- **Datos:** se conservan en el volumen `mongo-data` entre reinicios.
- **Configuración:** `CORS_ORIGIN` se toma de tu entorno o de `.env` (por defecto `*`). Para cambiar el puerto publicado edita `ports` en `docker-compose.yml` (p. ej. `'8080:5000'`).
- **Imagen:** `node:24-alpine` en dos etapas, solo dependencias de producción, ejecutada con el usuario sin privilegios `node` y con `HEALTHCHECK` sobre `/health`.
- **Logs:** la API corre con `NODE_ENV=production` y registra cada petición con morgan; la conexión a MongoDB se confirma con `✅ Conexión a MongoDB establecida`.
- **Problemas comunes:**
  - *`port is already allocated`*: otro proceso usa el puerto `5000` o `27017`; detenlo o cambia `ports` en `docker-compose.yml`.
  - *La API no llega a `healthy`*: revisa `docker compose logs api` y `docker compose logs mongo`.

### Opción 2: Node local

```bash
npm install
cp .env.example .env   # en Windows (PowerShell): Copy-Item .env.example .env
```

Ajusta `.env` (ver [Variables de entorno](#variables-de-entorno)). Si no tienes MongoDB instalado, levanta solo la base de datos con Docker:

```bash
npm run db:up     # solo MongoDB 8 en un contenedor (puerto 27017)
npm run db:down   # detiene y elimina los contenedores
```

Después arranca la API:

```bash
npm run dev     # desarrollo con recarga automática (node --watch)
npm start       # producción
```

## Variables de entorno

Se leen del archivo `.env` (o `.env.test` al ejecutar las pruebas) si existe, o del entorno del sistema.

| Variable      | Descripción                                          | Por defecto                           |
| ------------- | ---------------------------------------------------- | ------------------------------------- |
| `PORT`        | Puerto del servidor                                  | `5000`                                |
| `MONGODB_URI` | Cadena de conexión a MongoDB                         | `mongodb://127.0.0.1:27017/bookmarks` |
| `CORS_ORIGIN` | Orígenes permitidos: `*` o lista separada por comas  | `*`                                   |
| `NODE_ENV`    | Entorno de ejecución; con `test` se desactivan los logs de morgan | `development`            |

## Documentación (Swagger)

Con el servidor en marcha, la documentación interactiva está disponible en:

- **Swagger UI:** http://localhost:5000/docs
- **Especificación OpenAPI 3.1 (JSON):** http://localhost:5000/openapi.json

La especificación está definida en [`src/docs/openapi.js`](src/docs/openapi.js); actualízala al cambiar los endpoints.

## Endpoints

### Favoritos (prefijo `/api`)

| Método   | Ruta                | Descripción                    | Respuestas          |
| -------- | ------------------- | ------------------------------ | ------------------- |
| `GET`    | `/api/favoritos`    | Lista todos los marcadores (del más reciente al más antiguo) | `200`     |
| `GET`    | `/api/favorito/:id` | Obtiene un marcador por su id  | `200`, `400`, `404` |
| `POST`   | `/api/favorito`     | Crea un marcador               | `201`, `400`        |
| `PUT`    | `/api/favorito/:id` | Actualiza un marcador (parcial)| `200`, `400`, `404` |
| `DELETE` | `/api/favorito/:id` | Elimina un marcador            | `200`, `400`, `404` |

### Servicio

| Método | Ruta            | Descripción                            |
| ------ | --------------- | -------------------------------------- |
| `GET`  | `/health`       | Liveness (ver [Healthchecks](#healthchecks)) |
| `GET`  | `/health/ready` | Readiness (ver [Healthchecks](#healthchecks)) |
| `GET`  | `/docs`         | Documentación interactiva (Swagger UI) |
| `GET`  | `/openapi.json` | Especificación OpenAPI 3.1             |

### Healthchecks

| Ruta            | Tipo      | Qué comprueba                                   | Respuestas |
| --------------- | --------- | ----------------------------------------------- | ---------- |
| `/health`       | Liveness  | Que el proceso está vivo; no consulta dependencias | `200 { "status": "ok" }` |
| `/health/ready` | Readiness | Que MongoDB responde a un `ping` (límite de 2 s) | `200 { "status": "ok", "checks": { "database": "up" } }`<br>`503 { "status": "error", "checks": { "database": "down" } }` |

- Usa `/health` para decidir si **reiniciar** el proceso (p. ej. `livenessProbe` de Kubernetes). No depende de MongoDB, así que una caída de la base de datos no provoca reinicios en cadena.
- Usa `/health/ready` para decidir si **enviar tráfico** (p. ej. `readinessProbe` o el health check de un balanceador).
- Ambas respuestas incluyen `Cache-Control: no-store`.

El contenedor de MongoDB de `docker-compose.yml` también tiene un healthcheck (`mongosh` + `ping`); su estado se ve con `docker compose ps`.

### Datos de un favorito

| Campo         | Tipo   | Reglas                                                  |
| ------------- | ------ | ------------------------------------------------------- |
| `title`       | string | Obligatorio al crear, 1–200 caracteres                  |
| `description` | string | Opcional, máximo 1000 caracteres (por defecto `""`)     |
| `url`         | string | Obligatorio al crear, URL válida que empiece con `http://` o `https://` |

- **Solo se aceptan URLs `http` y `https`.** Se rechazan `javascript:`, `data:`, `vbscript:`, `file:`, `mailto:`, `ftp://`, etc., para que ningún cliente que muestre los enlaces quede expuesto a XSS. La regla se aplica en la validación de la petición y también en el modelo de Mongoose.
- Todos los mensajes de validación están en español (p. ej. `El título es obligatorio`, `La URL debe empezar con http:// o https://`).
- Se eliminan los espacios al inicio y al final de cada campo y se ignoran los campos desconocidos.
- En `PUT` todos los campos son opcionales, pero hay que enviar al menos uno.
- `:id` debe ser un ObjectId de MongoDB (24 caracteres hexadecimales).

### Ejemplos

Crear un marcador:

```bash
curl -X POST http://localhost:5000/api/favorito \
  -H "Content-Type: application/json" \
  -d '{"title": "Google", "description": "Buscador", "url": "https://google.com"}'
```

```json
{
  "favorito": {
    "id": "6a44b55a0ed255a4001f4cbe",
    "title": "Google",
    "description": "Buscador",
    "url": "https://google.com",
    "createdAt": "2026-09-16T12:00:00.000Z",
    "updatedAt": "2026-09-16T12:00:00.000Z"
  }
}
```

Las respuestas envuelven los datos en `favorito` (un marcador) o `favoritos` (lista). `DELETE` responde `{ "message": "El marcador se eliminó exitosamente" }`.

### Errores

Todos los errores responden JSON con un campo `message`:

| Código | Cuándo                                        | Ejemplo                                              |
| ------ | --------------------------------------------- | ---------------------------------------------------- |
| `400`  | Datos inválidos                               | `{ "message": "Datos inválidos", "errors": [{ "path": "url", "message": "La URL debe empezar con http:// o https://" }] }` |
| `400`  | El cuerpo no es un objeto JSON (p. ej. `[]` o `"texto"`) | `{ "message": "Datos inválidos", "errors": [{ "path": "", "message": "El cuerpo de la petición debe ser un objeto JSON" }] }` |
| `400`  | Id con formato incorrecto                     | `{ "message": "Datos inválidos", "errors": [{ "path": "", "message": "El identificador no es válido" }] }` |
| `400`  | El cuerpo no es JSON válido                   | `{ "message": "El cuerpo de la petición no es un JSON válido" }` |
| `404`  | El marcador no existe                         | `{ "message": "No existe el marcador" }`             |
| `404`  | Ruta desconocida                              | `{ "message": "Recurso no encontrado" }`             |
| `413`  | El cuerpo supera 100 KB                       | `{ "message": "El cuerpo de la petición es demasiado grande" }` |
| `415`  | Charset o codificación no soportados (p. ej. `charset=latin-9`) | `{ "message": "Codificación de caracteres no soportada" }` |
| `500`  | Error inesperado (el detalle solo se registra en el log del servidor) | `{ "message": "Error interno del servidor" }` |

## Pruebas

```bash
npm run test:unit         # pruebas unitarias (no necesitan MongoDB)
npm run test:integration  # pruebas de integración (necesitan MongoDB en marcha)
npm test                  # todas las pruebas
npm run test:coverage     # todas las pruebas con umbral mínimo de cobertura
```

| Tipo | Carpeta | Qué cubre | Necesita MongoDB |
| ---- | ------- | --------- | ---------------- |
| Unitarias | `tests/unit` | Validación, modelo, controladores (con el modelo simulado), healthchecks (con la conexión simulada), middleware de errores, configuración y rutas que responden sin tocar la base de datos | No |
| Integración | `tests/integration` | CRUD completo y healthchecks con supertest contra MongoDB real, incluida la respuesta `503` al desconectar la base de datos | Sí |

Para las de integración basta con tener MongoDB en `127.0.0.1:27017`; sirve el contenedor de cualquiera de las dos opciones de [Ejecución](#ejecución):

```bash
npm run db:up             # o: docker compose up -d --build --wait
npm test
```

Las pruebas de integración usan la base de datos `bookmarks_test`, que se elimina al terminar, así que no tocan los datos de `bookmarks` aunque la API esté corriendo al mismo tiempo. Para usar otra base de datos, crea un archivo `.env.test` (está ignorado por git):

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/bookmarks_test
```

Si no existe, Node muestra `.env.test not found. Continuing without it.`; es solo informativo.

`tests/setup.js` se carga antes de cada archivo de prueba y establece `NODE_ENV=test` (desactiva los logs de morgan). Los archivos se ejecutan de uno en uno (`--test-concurrency=1`) porque las pruebas de integración comparten la misma base de datos.

La cobertura excluye `src/server.js` (solo arranca el servidor) y exige líneas ≥ 90 %, ramas ≥ 85 % y funciones ≥ 90 %. Resultado actual: 75 pruebas, líneas 99.6 %, ramas 97.3 %, funciones 100 %.

### Integración continua

El workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) se ejecuta en cada push a `master`, en cada pull request y de forma manual:

1. **Pruebas unitarias** en Node 22 y 24.
2. **Pruebas de integración y cobertura** (`npm run test:coverage`) con un servicio `mongo:8`; solo corre si pasan las unitarias.
3. **Imagen Docker y prueba de humo**: construye la imagen, levanta API + MongoDB con `docker compose up --wait` (espera a los healthchecks), comprueba `/health/ready`, crea, consulta y elimina un marcador, y verifica que la API no corre como root; solo corre si pasan las unitarias.
4. **Auditoría de dependencias** (`npm audit --audit-level=moderate`): falla si hay vulnerabilidades moderadas o superiores.

## Estructura

```
.github/workflows/ci.yml        # Pipeline de CI (GitHub Actions)
Dockerfile                      # Imagen de producción de la API
.dockerignore                   # Archivos excluidos de la imagen
docker-compose.yml              # API + MongoDB con healthchecks
src/
├── app.js                      # Configuración de Express (middlewares y rutas)
├── server.js                   # Arranque y apagado ordenado
├── config.js                   # Configuración por variables de entorno
├── db.js                       # Conexión a MongoDB
├── controllers/                # Lógica de los endpoints
├── docs/                       # Especificación OpenAPI
├── middleware/                 # Manejo de errores y 404
├── models/                     # Esquemas de Mongoose
├── routes/                     # Definición de rutas
├── utils/                      # Utilidades (ApiError)
└── validation/                 # Esquemas de validación (zod)
tests/
├── setup.js                    # Prepara el entorno de pruebas
├── unit/                       # Pruebas unitarias (node:test)
└── integration/                # Pruebas de integración (supertest + MongoDB)
```

## Licencia

ISC
