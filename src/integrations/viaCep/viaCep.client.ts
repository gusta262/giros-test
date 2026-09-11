import axios from 'axios';
import { ViaCepAdress } from './viaCep.types';

export async function searchCep(cep: string): Promise<ViaCepAdress | null> {
  const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);

  if (data.erro) {
    return null;
  }

  return data;
}
