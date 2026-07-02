# api-restful-favoritos

API RESTful para guardar páginas favoritas (marcadores), construida con **Node.js**, **Express 5** y **MongoDB** (Mongoose 8).

## Requisitos

- Node.js >= 20
- MongoDB en ejecución (se incluye `docker-compose.yml` para levantarlo con Docker)

## Instalación

```bash
npm install
cp .env.example .env   # ajusta los valores según tu entorno
```

## Base de datos con Docker

```bash
npm run db:up     # levanta MongoDB 8 en un contenedor (puerto 27017)
npm run db:down   # detiene y elimina el contenedor
```

## Uso

```bash
npm run dev     # desarrollo con recarga automática (node --watch)
npm start       # producción
npm test        # ejecuta la batería de pruebas (requiere MongoDB en marcha)
```

Los tests usan una base de datos aparte (`bookmarks_test`, configurada en `.env.test`) que se elimina al terminar, por lo que no tocan tus datos de desarrollo.

El servidor arranca por defecto en `http://localhost:5000`.

## Documentación (Swagger)

Con el servidor en marcha, la documentación interactiva está disponible en:

- **Swagger UI:** http://localhost:5000/docs
- **Especificación OpenAPI 3.1 (JSON):** http://localhost:5000/openapi.json

## Variables de entorno

| Variable       | Descripción                                | Por defecto                              |
| -------------- | ------------------------------------------ | ---------------------------------------- |
| `PORT`         | Puerto del servidor                        | `5000`                                   |
| `MONGODB_URI`  | Cadena de conexión a MongoDB               | `mongodb://127.0.0.1:27017/bookmarks`    |
| `CORS_ORIGIN`  | Orígenes permitidos (`*` o lista por comas)| `*`                                      |

## Endpoints

Base: `/api`

| Método   | Ruta               | Descripción                       |
| -------- | ------------------ | --------------------------------- |
| `GET`    | `/favoritos`       | Lista todos los marcadores        |
| `GET`    | `/favorito/:id`    | Obtiene un marcador por su id     |
| `POST`   | `/favorito`        | Crea un marcador                  |
| `PUT`    | `/favorito/:id`    | Actualiza un marcador             |
| `DELETE` | `/favorito/:id`    | Elimina un marcador               |
| `GET`    | `/health`          | Healthcheck del servicio          |
| `GET`    | `/docs`            | Documentación interactiva (Swagger UI) |
| `GET`    | `/openapi.json`    | Especificación OpenAPI 3.1        |

### Cuerpo de un favorito

```json
{
  "title": "Google",
  "description": "Buscador",
  "url": "https://google.com"
}
```

`title` y `url` son obligatorios; `url` debe ser una URL válida. Las peticiones se validan con [zod](https://zod.dev) y devuelven `400` con el detalle de los errores cuando los datos no son válidos.

## Estructura

```
src/
├── app.js                      # Configuración de Express
├── server.js                   # Arranque y apagado graceful
├── config.js                   # Configuración por variables de entorno
├── db.js                       # Conexión a MongoDB
├── controllers/                # Lógica de los endpoints
├── routes/                     # Definición de rutas
├── models/                     # Esquemas de Mongoose
├── validation/                 # Esquemas de validación (zod)
├── middleware/                 # Manejo de errores
└── utils/                      # Utilidades (ApiError)
tests/                          # Pruebas con node:test + supertest
```
