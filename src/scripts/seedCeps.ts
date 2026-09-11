import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { connectMongo } from '../config/db';
import { CepModel } from '../models/cep.model';

const CSV_PATH = path.join(__dirname, '../../carapicuiba-sample.csv');

function parseCsvLine(line: string): string[] {
  return (line.match(/(".*?"|[^,]+)(?=,|$)/g) ?? []).map((field) => field.replace(/^"|"$/g, ''));
}

async function seed() {
  await connectMongo();

  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const [, ...lines] = content.trim().split('\n');

  let count = 0;

  for (const line of lines) {
    const [cep, logradouro, bairro, localidade, uf, lat, lng] = parseCsvLine(line);

    await CepModel.findOneAndUpdate(
      { cep },
      {
        cep,
        logradouro,
        bairro,
        localidade,
        uf,
        lat: Number(lat),
        lng: Number(lng),
        location: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)],
        },
      },
      { upsert: true, new: true },
    );

    count++;
  }

  console.log(`Seed concluído: ${count} CEPs inseridos/atualizados`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Erro ao popular CEPs', err);
  process.exit(1);
});
