import { NextFunction, Request, Response } from 'express';

const CEP_REGEX = /^\d{5}-?\d{3}$/;

export function validateCep(req: Request, res: Response, next: NextFunction) {
  const { cep } = req.params;

  if (!CEP_REGEX.test(cep)) {
    return res.status(400).json({ message: 'CEP inválido. Formato esperado: 00000-000 ou 00000000' });
  }

  next();
}
