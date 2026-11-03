import { Router } from 'express';

import * as controller from '../controllers/favorite.controller.js';

export const favoriteRouter = Router();

favoriteRouter.get('/favoritos', controller.getFavoritos);
favoriteRouter.post('/favoritos', controller.saveFavorito);
favoriteRouter.get('/favoritos/:id', controller.getFavorito);
favoriteRouter.patch('/favoritos/:id', controller.updateFavorito);
favoriteRouter.delete('/favoritos/:id', controller.deleteFavorito);
