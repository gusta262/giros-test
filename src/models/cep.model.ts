import { Schema, model } from 'mongoose';

export interface CepDocument {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  lat: number;
  lng: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
}

const cepSchema = new Schema<CepDocument>(
  {
    cep: { type: String, required: true, unique: true },
    logradouro: { type: String, required: true },
    bairro: { type: String, required: true },
    localidade: { type: String, required: true },
    uf: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
  },
  { timestamps: true },
);

cepSchema.index({ location: '2dsphere' });

export const CepModel = model<CepDocument>('Cep', cepSchema);
