import { Router } from 'express';
import * as statusController from '../controllers/status.controller';

const router = Router();

router.get('/', statusController.getStatus);

export default router;
