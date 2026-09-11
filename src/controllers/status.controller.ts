import { Request, Response } from 'express';
import * as statusService from '../services/status.service';

export function getStatus(req: Request, res: Response) {
  res.json(statusService.getStatus());
}
