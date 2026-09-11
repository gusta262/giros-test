import * as viaCepClient from '../integrations/viaCep/viaCep.client';
import { ViaCepAdress } from '../integrations/viaCep/viaCep.types';
import * as geocodingClient from '../integrations/geocoding/geocoding.client';
import { Coordinates } from '../integrations/geocoding/geocoding.types';
import { CepModel } from '../models/cep.model';
import { redisClient } from '../config/redis';

export interface NearbyCep {
  cep: string;
  distancia_km: number;
}

export const GEOCODING_CACHE_PREFIX = 'cep:geocoding:';
const GEOCODING_CACHE_TTL = 60 * 60 * 24 * 30 * 6;

export async function searchCep(cep: string) {
  const adress = await viaCepClient.searchCep(cep);

  return adress;
}

export async function getCoordinates(address: ViaCepAdress): Promise<Coordinates | null> {
  const cacheKey = `${GEOCODING_CACHE_PREFIX}${address.cep}`;

  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const coordinates = await geocodingClient.searchAddress({
    street: address.logradouro,
    city: address.localidade,
    state: address.uf,
  });

  if (coordinates) {
    await redisClient.set(cacheKey, JSON.stringify(coordinates), { EX: GEOCODING_CACHE_TTL });
  }

  return coordinates;
}

export async function findNearbyCeps(coordinates: Coordinates, radiusInMeters = 1000): Promise<NearbyCep[]> {
  const results = await CepModel.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [coordinates.lng, coordinates.lat] },
        distanceField: 'distance_m',
        maxDistance: radiusInMeters,
        spherical: true,
      },
    }
  ]);

  return results.map((result) => ({
    cep: result.cep,
    distancia_km: Number((result.distance_m / 1000).toFixed(2))
  }));
}
