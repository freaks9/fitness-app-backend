import { FastifyInstance } from 'fastify';
import { analyzeLabelImage, analyzeMealImage } from '../services/aiAnalysis';

export default async function aiRoutes(fastify: FastifyInstance) {
    fastify.post('/analyze-meal', async (request, reply) => {
        const { image } = request.body as { image: string };
        fastify.log.info('--- Received /analyze-meal request ---');

        if (!image) {
            return reply.code(400).send({ error: 'Image data is required' });
        }

        try {
            const base64Image = image.replace(/^data:image\/\w+;base64,/, "");
            const analysis = await analyzeMealImage(base64Image);

            if (analysis) {
                return { analysis };
            } else {
                return reply.code(500).send({ error: 'Failed to analyze meal image' });
            }
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    fastify.post('/analyze-label', async (request, reply) => {
        const { image } = request.body as { image: string };

        if (!image) {
            return reply.code(400).send({ error: 'Image data is required' });
        }

        try {
            const base64Image = image.replace(/^data:image\/\w+;base64,/, "");
            const analysis = await analyzeLabelImage(base64Image);

            if (analysis) {
                return { analysis };
            } else {
                return reply.code(500).send({ error: 'Failed to analyze label image' });
            }
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });
}
