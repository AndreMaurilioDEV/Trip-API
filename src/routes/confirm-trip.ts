import { FastifyInstance } from "fastify";
import { z } from 'zod'; // biblioteca de schema validation
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";
import { dayjs } from "../lib/dayjs";
import nodemailer from 'nodemailer';
import { ClientError } from "../errors/client-error";
import { env } from "../env";

export async function confirmTrip(app: FastifyInstance) {
   app.withTypeProvider<ZodTypeProvider>().get("/trips/:tripId/confirm", {
    schema: {
        params: z.object({
           tripId: z.string().uuid()
        })
    }
   }, async (request, reply) => {
    const { tripId } = request.params;

    const trip = await prisma.trip.findUnique({ 
      // encontra a trip com id igual do params, além de incluir os participants(is_owner = false) dessa trip 
      where: {
         id: tripId
      },
      include: {
         participants: {
            where: {
               is_owner: false,
            }
         }
      }
    });

    if (!trip) {
      throw new ClientError("Trip not found");
    }

    if(trip.is_confirmed) { // redireciona o user pra o front, caso a viagem já esteja confirmada
      return reply.redirect(`${env.API_BASE_URL}}/trips/${tripId}`)
    }
   await prisma.trip.update({ // atualiza o is confirmed pra true quando o is confirmed for false
      where: { id: tripId },
      data: { is_confirmed: true },
    });

    const formattedStartedDate = dayjs(trip.starts_at).format('LL');
    const formattedEndDate = dayjs(trip.ends_at).format('LL');

    
    const mail = await getMailClient();

    await Promise.all([
      trip.participants.map(async (item) => {
         const confirmattionLink = `${env.API_BASE_URL}/participants/${item.id}/confirm`;
         const message =  await mail.sendMail({ // envio de email com sendMail(from/to/subject/html)
            from: {
                name: 'Equipe Planner',
                address: 'atendimento@planner.com'
            },
            to: item.email,
            subject: `Confirme sua presença na viagem para ${trip.destination} em ${formattedStartedDate}`,
            html: `
            <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
            <p>Você foi convidado(a) para participar de uma viagem para <strong>${trip.destination}</strong> nas datas de <strong>${formattedStartedDate}</strong> até <strong>${formattedEndDate}</strong></p>
            <p></p>
            <p>Para confirmar sua presença, clique no link abaixo:</p>
            <p></p>
            <p>
                <a href="${confirmattionLink}">Confirmar viagem</a>
            </p>
            <p></p>
            <p>Caso você não saiba do que se trata esse e-mail, apenas ignore-o.</p>
            </div>
            `.trim()
        })
    
        console.log(nodemailer.getTestMessageUrl(message))
      })
    ])

    return reply.redirect(`${env.API_BASE_URL}/trips/${tripId}`)

   })
}