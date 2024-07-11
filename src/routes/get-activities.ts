import { FastifyInstance } from "fastify";
import { date, z } from 'zod'; // biblioteca de schema validation
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { dayjs } from "../lib/dayjs";
import { ClientError } from "../errors/client-error";

// withTypeProvider<ZodTypeProvider>() uso do provider zod 
// schema é a validação
// z.coerce converte o json pra uma date

export async function getActivity(app: FastifyInstance) {
   app.withTypeProvider<ZodTypeProvider>().get("/trips/:tripId/activities", {
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
        activities: {
          orderBy: {
            occurs_at: 'asc'
          }
        }
      }
    });

    if (!trip) {
      throw new ClientError("Trip not found");
    }

    // retorna a diferença em dias de start e end com diff e 'days'
    const differenceInDaysBetweenTripStartAndEnd = dayjs(trip.ends_at).diff(trip.starts_at, 'days');
    const activities = Array.from({ length: differenceInDaysBetweenTripStartAndEnd + 2  }).map((_, index) => {
      const date = dayjs(trip.starts_at).add(index, 'days');
      return {
        date: date.toDate(),
        activities: trip.activities.filter((activity) => {
          return dayjs(activity.occurs_at).isSame(date, 'day') // retorna a atividade que acontece no mesmo dia de occurs e date
        })
      }
    })

    return { activities }

   });
}