import { FastifyInstance } from "fastify";
import { z } from 'zod'; // biblioteca de schema validation
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { ClientError } from "../errors/client-error";

// withTypeProvider<ZodTypeProvider>() uso do provider zod 
// schema é a validação
// z.coerce converte o json pra uma date

export async function createLink(app: FastifyInstance) {
   app.withTypeProvider<ZodTypeProvider>().post("/trips/:tripId/links", {
    schema: {
        params: z.object({
          tripId: z.string().uuid()
        }),
        body: z.object({
            title: z.string({
              required_error: 'Title is required',
              invalid_type_error: 'Title must be a string'
            }).min(4),
            url: z.string({
              required_error: 'Url is required',
              invalid_type_error: 'Url must be a string'
            }).url(),
        })
    }
   }, async (request) => {
    const { tripId } = request.params;
    const {
      title,
      url
    } = request.body;

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId
      }
    });

    if (!trip) {
      throw new ClientError("Trip not found");
    } // se a viagem existir, cria o link
    const link = await prisma.link.create({
      data: {
        title,
        url,
        tripId: tripId
      }
    });

    return { linkId: link.id }

   });
}