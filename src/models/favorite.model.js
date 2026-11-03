import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Las reglas de los campos viven en validation/favorite.schema.js.
const favoriteSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    url: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret._id;
        return ret;
      },
    },
  },
);

export const Favorite = model('Favorite', favoriteSchema);
