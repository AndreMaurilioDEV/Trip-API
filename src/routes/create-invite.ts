import { FastifyInstance } from "fastify";
import { z } from 'zod'; // biblioteca de schema validation
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { dayjs } from "../lib/dayjs";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer';
import { ClientError } from "../errors/client-error";
import { env } from "../env";

// withTypeProvider<ZodTypeProvider>() uso do provider zod 
// schema é a validação
// z.coerce converte o json pra uma date

export async function createInvite(app: FastifyInstance) {
   app.withTypeProvider<ZodTypeProvider>().post("/trips/:tripId/invites", {
    schema: {
        params: z.object({
          tripId: z.string().uuid()
        }),
        body: z.object({
            email: z.string({
              required_error: 'Email is required',
              invalid_type_error: 'Email must be a string'
            }).email(),
            name: z.string({
              required_error: 'Name is required',
              invalid_type_error: 'Name must be a string'
            }).min(4)
        })
    }
   }, async (request) => {
    const { tripId } = request.params;
    const {
      email,
      name
    } = request.body;

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId
      }
    });

    if (!trip) {
      throw new ClientError("Trip not found");
    } // se a viagem existir, cria o link
   const participant = await prisma.participant.create({
      data: {
        name: name,
        email: email,
        tripId: tripId
      }
   });

   const formattedStartedDate = dayjs(trip.starts_at).format('LL');
   const formattedEndDate = dayjs(trip.ends_at).format('LL');

   
   const mail = await getMailClient();

        const confirmattionLink = `${env.API_BASE_URL}/participants/${participant.id}/confirm`;
        const message =  await mail.sendMail({ // envio de email com sendMail(from/to/subject/html)
           from: {
               name: 'Equipe Planner',
               address: 'atendimento@planner.com'
           },
           to: participant.email,
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
  
    return { participant : participant.id }

   });
}