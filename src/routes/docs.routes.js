import { Router } from 'express';
import { getDocuments } from '../controllers/document.controller.js';

const router = Router();

router.get('/', getDocuments);

export default router;
