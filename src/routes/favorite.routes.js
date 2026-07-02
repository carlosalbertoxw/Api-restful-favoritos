import { Router } from 'express';

import * as controller from '../controllers/favorite.controller.js';

export const favoriteRouter = Router();

favoriteRouter.get('/favoritos', controller.getFavoritos);
favoriteRouter.get('/favorito/:id', controller.getFavorito);
favoriteRouter.post('/favorito', controller.saveFavorito);
favoriteRouter.put('/favorito/:id', controller.updateFavorito);
favoriteRouter.delete('/favorito/:id', controller.deleteFavorito);
