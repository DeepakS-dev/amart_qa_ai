import { Router } from 'express';
import healthRoutes from './health.routes.js';
import docsRoutes from './docs.routes.js';
import askRoutes from './ask.routes.js';
import authRoutes from './auth.routes.js';

const router = Router();

router.use('/v1/health', healthRoutes);
router.use('/docs', docsRoutes);
router.use('/auth', authRoutes);
router.use('/ask', askRoutes);

export default router;
