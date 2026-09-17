import mongoose from 'mongoose';

import { DESCRIPTION_MAX, HTTP_URL_REGEX, TITLE_MAX } from '../validation/favorite.schema.js';

const { Schema, model } = mongoose;

const favoriteSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
      maxlength: [TITLE_MAX, `El título no puede tener más de ${TITLE_MAX} caracteres`],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [
        DESCRIPTION_MAX,
        `La descripción no puede tener más de ${DESCRIPTION_MAX} caracteres`,
      ],
      default: '',
    },
    // Segunda barrera además de zod: nunca se guarda una URL que no sea http(s).
    url: {
      type: String,
      required: [true, 'La URL es obligatoria'],
      trim: true,
      match: [HTTP_URL_REGEX, 'La URL debe empezar con http:// o https://'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

export const Favorite = model('Favorite', favoriteSchema);
