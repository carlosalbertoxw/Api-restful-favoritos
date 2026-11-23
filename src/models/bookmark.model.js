import mongoose from 'mongoose';

const { Schema, model } = mongoose;

// Las reglas de los campos viven en validation/bookmark.schema.js.
const bookmarkSchema = new Schema(
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

// Soporta el orden del listado paginado.
bookmarkSchema.index({ createdAt: -1, _id: -1 });

export const Bookmark = model('Bookmark', bookmarkSchema);
