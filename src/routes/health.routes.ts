
import { Router } from 'express';
import { isDatabaseConnected } from '../config/db';
import { AppError } from '../utils/AppError';

const router = Router();

router.get('/', (_req, res) => {
  if (!isDatabaseConnected()) {
    throw new AppError(503, 'Database not connected');
  }

  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      database: 'connected',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
