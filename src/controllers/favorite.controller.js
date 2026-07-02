import { Favorite } from '../models/favorite.model.js';
import { ApiError } from '../utils/ApiError.js';
import {
  createFavoriteSchema,
  objectIdSchema,
  updateFavoriteSchema,
} from '../validation/favorite.schema.js';

export async function getFavoritos(_req, res) {
  const favoritos = await Favorite.find().sort('-createdAt');
  res.json({ favoritos });
}

export async function getFavorito(req, res) {
  const id = objectIdSchema.parse(req.params.id);
  const favorito = await Favorite.findById(id);

  if (!favorito) {
    throw new ApiError(404, 'No existe el marcador');
  }

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

  const favorito = await Favorite.findByIdAndUpdate(id, data, {
    returnDocument: 'after',
    runValidators: true,
  });

  if (!favorito) {
    throw new ApiError(404, 'No existe el marcador');
  }

  res.json({ favorito });
}

export async function deleteFavorito(req, res) {
  const id = objectIdSchema.parse(req.params.id);
  const favorito = await Favorite.findByIdAndDelete(id);

  if (!favorito) {
    throw new ApiError(404, 'No existe el marcador');
  }

  res.json({ message: 'El marcador se eliminó exitosamente' });
}
