import axios from 'axios';
import { Coordinates } from './geocoding.types';

interface NominatimResult {
  lat: string;
  lon: string;
}

interface SearchAddressParams {
  street: string;
  city: string;
  state: string;
}

export async function searchAddress({ street, city, state }: SearchAddressParams): Promise<Coordinates | null> {
  const { data } = await axios.get<NominatimResult[]>('https://nominatim.openstreetmap.org/search', {
    params: {
      street,
      city,
      state,
      country: 'Brasil',
      format: 'json',
      limit: 1,
    },
    headers: {
      'User-Agent': 'giros-test-app/1.0',
    },
  });

  if (data.length === 0) {
    return null;
  }

  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
  };
}
