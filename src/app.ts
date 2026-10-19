
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import userRoutes from './routes/user.routes';
import teacherRoutes from './routes/teacher.routes';
import sessionRoutes from './routes/session.routes';
import healthRoutes from './routes/health.routes';
import { rateLimiter } from './middlewares/rateLimiter';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health checks bypass the general API rate limiter.
app.use('/health', healthRoutes);

app.use(rateLimiter);

app.use('/users', userRoutes);
app.use('/teachers', teacherRoutes);
app.use('/sessions', sessionRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
