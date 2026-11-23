import { Router } from 'express';

import * as controller from '../controllers/bookmark.controller.js';

export const bookmarkRouter = Router();

bookmarkRouter.get('/bookmarks', controller.listBookmarks);
bookmarkRouter.post('/bookmarks', controller.createBookmark);
bookmarkRouter.get('/bookmarks/:id', controller.getBookmark);
bookmarkRouter.patch('/bookmarks/:id', controller.updateBookmark);
bookmarkRouter.delete('/bookmarks/:id', controller.deleteBookmark);
