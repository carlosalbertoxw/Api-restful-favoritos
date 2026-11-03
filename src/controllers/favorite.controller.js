import { Favorite } from '../models/favorite.model.js';
import { ApiError } from '../utils/ApiError.js';
import {
  createFavoriteSchema,
  listQuerySchema,
  objectIdSchema,
  updateFavoriteSchema,
} from '../validation/favorite.schema.js';

function foundOr404(favorito) {
  if (!favorito) {
    throw new ApiError(404, 'No existe el marcador');
  }
  return favorito;
}

export async function getFavoritos(req, res) {
  const { limit, skip } = listQuerySchema.parse(req.query);
  const favoritos = await Favorite.find().sort('-createdAt -_id').skip(skip).limit(limit);
  res.json({ favoritos });
}

export async function getFavorito(req, res) {
  const id = objectIdSchema.parse(req.params.id);
  const favorito = foundOr404(await Favorite.findById(id));
  res.json({ favorito });
}

export async function saveFavorito(req, res) {
  const data = createFavoriteSchema.parse(req.body);
  const favorito = await Favorite.create(data);
  res.status(201).json({ favorito });
}

export async function updateFavorito(req, res) {
  const id = objectIdSchema.parse(req.params.id);
  const data = updateFavoriteSchema.parse(req.body);
  const favorito = foundOr404(
    await Favorite.findByIdAndUpdate(id, data, { returnDocument: 'after' }),
  );
  res.json({ favorito });
}

export async function deleteFavorito(req, res) {
  const id = objectIdSchema.parse(req.params.id);
  foundOr404(await Favorite.findByIdAndDelete(id));
  res.status(204).end();
}
