import { FastifyInstance } from "fastify";
import { z } from 'zod'; // biblioteca de schema validation
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { dayjs } from "../lib/dayjs";
import { ClientError } from "../errors/client-error";

// withTypeProvider<ZodTypeProvider>() uso do provider zod 
// schema é a validação
// z.coerce converte o json pra uma date

export async function createActivity(app: FastifyInstance) {
   app.withTypeProvider<ZodTypeProvider>().post("/trips/:tripId/activities", {
    schema: {
        params: z.object({
          tripId: z.string().uuid()
        }),
        body: z.object({
            title: z.string({
              required_error: 'Title is required',
              invalid_type_error: 'Title name must be a string'
            }).min(4),
            occurs_at: z.coerce.date({
              required_error: 'Occurs date is required',
              invalid_type_error: 'Occurs must be a date'
            }),
        })
    }
   }, async (request) => {
    const { tripId } = request.params;
    const {
      title,
      occurs_at
    } = request.body;

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId
      }
    });

    if (!trip) {
      throw new Error("Trip not found");
    }

    if (dayjs(occurs_at).isBefore(trip.starts_at)) {
      throw new ClientError("Invalid activity date")
    } // se esse if for false, a activity é criada
    const activity = await prisma.activity.create({
      data: {
        title,
        occurs_at,
        tripId: tripId
      }
    });

    return { activityId: activity.id }

   });
}