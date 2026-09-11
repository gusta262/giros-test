import { Router } from 'express';
import * as cepController from '../controllers/cep.controller';
import { validateCep } from '../middlewares/validateCep.middleware';

const router = Router();

router.get('/ceps-proximos/:cep', validateCep, cepController.searchCep);
router.delete('/cache/:cep', cepController.clearCache);
router.delete('/cache', cepController.clearCache);

export default router;
