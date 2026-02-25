import cors from '@fastify/cors';
import dotenv from 'dotenv';
import Fastify from 'fastify';
import { prisma } from './db';
import aiRoutes from './routes/ai';
import foodRoutes from './routes/food';
import logRoutes from './routes/logs';

dotenv.config();

const fastify = Fastify({
    logger: true,
    bodyLimit: 10485760 // 10MB
});

// CORS
fastify.register(cors, {
    origin: true // Allow all origins for development/Expo
});
// const prisma = new PrismaClient();

// Register Routes

fastify.register(foodRoutes, { prefix: '/api/food' });
fastify.register(logRoutes, { prefix: '/api/logs' });
fastify.register(aiRoutes, { prefix: '/api/ai' });

fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    console.error('Fastify Global Error Handler:', error);
    const errorMessage = (error as any).message || 'Unknown Error';
    reply.status(500).send({ error: 'Internal Server Error', message: errorMessage });
});

// Health Check
fastify.get('/health', async (request, reply) => {
    return { status: 'ok' };
});

fastify.get('/', async (request, reply) => {
    return { status: 'ok', message: 'Fitness App API is running' };
});

const start = async () => {
    try {
        await prisma.$connect();
        fastify.log.info('Connected to Database');

        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
