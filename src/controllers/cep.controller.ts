import { Request, Response } from "express";
import * as cepService from "../services/cep.service";
import { redisClient } from "../config/redis";

const NEARBY_CACHE_PREFIX = "cep:search:nearby:";
const NEARBY_CACHE_TTL = 60 * 60 * 24 * 30;

export async function searchCep(req: Request, res: Response) {
  try {
    const { cep } = req.params;
    const redisKey = `${NEARBY_CACHE_PREFIX}${cep}`;

    const cacheExists = await redisClient.exists(redisKey);
    if (cacheExists === 1) {
      const cached = await redisClient.get(redisKey);
      const parsedCache = JSON.parse(cached as string);
      return res.json(parsedCache);
    }

    const address = await cepService.searchCep(cep);
    if (!address) {
      return res.status(404).json({ message: "CEP não encontrado" });
    }

    const coordinates = await cepService.getCoordinates(address);
    if (!coordinates) {
      return res
        .status(404)
        .json({ message: "Coordenadas não encontradas para o CEP informado" });
    }

    const nearbyCeps = await cepService.findNearbyCeps(coordinates);

    await redisClient.set(redisKey, JSON.stringify(nearbyCeps), { EX: NEARBY_CACHE_TTL });

    res.json(nearbyCeps);
  } catch (error) {
    res.status(500).json({ message: "Erro ao consultar os ceps próximos" });
  }
}

export async function clearCache(req: Request, res: Response) {
  try {
    const { cep } = req.params;

    if (cep) {
      await redisClient.del(`${NEARBY_CACHE_PREFIX}${cep}`);
      return res.json({ message: `Cache limpo para o CEP ${cep}` });
    }

    const keys = await redisClient.keys(`${NEARBY_CACHE_PREFIX}*`);

    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    res.json({ message: `Cache limpo (${keys.length} chave(s) removida(s))` });
  } catch (error) {
    res.status(500).json({ message: "Erro ao limpar cache" });
  }
}
