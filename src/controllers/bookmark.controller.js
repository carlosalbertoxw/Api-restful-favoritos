import { Bookmark } from '../models/bookmark.model.js';
import { ApiError } from '../utils/ApiError.js';
import {
  createBookmarkSchema,
  listQuerySchema,
  objectIdSchema,
  updateBookmarkSchema,
} from '../validation/bookmark.schema.js';

function foundOr404(bookmark) {
  if (!bookmark) {
    throw new ApiError(404, 'No existe el marcador');
  }
  return bookmark;
}

export async function listBookmarks(req, res) {
  const { limit, skip } = listQuerySchema.parse(req.query);
  // Se pide uno más de los solicitados solo para saber si queda otra página.
  const found = await Bookmark.find().sort('-createdAt -_id').skip(skip).limit(limit + 1);
  res.json({ bookmarks: found.slice(0, limit), hasMore: found.length > limit });
}

export async function getBookmark(req, res) {
  const id = objectIdSchema.parse(req.params.id);
  const bookmark = foundOr404(await Bookmark.findById(id));
  res.json({ bookmark });
}

export async function createBookmark(req, res) {
  const data = createBookmarkSchema.parse(req.body);
  const bookmark = await Bookmark.create(data);
  res.status(201).json({ bookmark });
}

const EDITABLE_FIELDS = ['title', 'description', 'url'];

export async function updateBookmark(req, res) {
  const id = objectIdSchema.parse(req.params.id);
  const data = updateBookmarkSchema.parse(req.body);

  // zod ya descarta campos desconocidos y exige texto; además, el update se arma
  // solo con campos conocidos y valores de texto, para que ningún valor del
  // cliente pueda llegar a MongoDB como operador (p. ej. { "$where": ... }).
  const changes = {};
  for (const field of EDITABLE_FIELDS) {
    if (typeof data[field] === 'string') {
      changes[field] = data[field];
    }
  }

  const bookmark = foundOr404(
    await Bookmark.findByIdAndUpdate(id, { $set: changes }, { returnDocument: 'after' }),
  );
  res.json({ bookmark });
}

export async function deleteBookmark(req, res) {
  const id = objectIdSchema.parse(req.params.id);
  foundOr404(await Bookmark.findByIdAndDelete(id));
  res.status(204).end();
}
