import { FastifyInstance } from "fastify";
import { z } from 'zod'; // biblioteca de schema validation
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { ClientError } from "../errors/client-error";

// withTypeProvider<ZodTypeProvider>() uso do provider zod 
// schema é a validação
// z.coerce converte o json pra uma date

export async function getLinks(app: FastifyInstance) {
   app.withTypeProvider<ZodTypeProvider>().get("/trips/:tripId/links", {
    schema: {
        params: z.object({
          tripId: z.string().uuid()
        })
    }
   }, async (request) => {
    const { tripId } = request.params;
    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId
      },
      include: {
       links: true
      }
    });

    if (!trip) {
      throw new ClientError("Trip not found");
    }
    
    return { links: trip.links }

   });
}