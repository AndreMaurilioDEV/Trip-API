import { FastifyInstance } from "fastify";
import { z } from 'zod'; // biblioteca de schema validation
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer';
import { dayjs } from "../lib/dayjs";
import { ClientError } from "../errors/client-error";
import { env } from "../env";

// withTypeProvider<ZodTypeProvider>() uso do provider zod 
// schema é a validação
// z.coerce converte o json pra uma date

export async function createTrip(app: FastifyInstance) {
   app.withTypeProvider<ZodTypeProvider>().post("/trips", {
    schema: {
        body: z.object({
            destination: z.string({
                required_error: 'Destination is required',
                invalid_type_error: 'Destination must be a string'
            }).min(4),
            starts_at: z.coerce.date({
                required_error: 'Starts date at is required',
                invalid_type_error: 'Starts date at must be a date'
            }),
            ends_at: z.coerce.date({
                required_error: 'Ends date at is required',
                invalid_type_error: 'Ends date at must be a date'
            }),
            owner_name: z.string({
                required_error: 'Owner name is required',
                invalid_type_error: 'Owner name must be a string'
            }),
            owner_email: z.string({
                required_error: 'Owner email is required',
                invalid_type_error: 'Owner email must be a string'
            }).email(),
            emails_to_invite: z.array(z.string().email(), {
                required_error: 'Emails to invite are required',
                invalid_type_error: 'Emails to invite must be an array'
            })
        })
    }
   }, async (request) => {
    const {destination, starts_at, ends_at, owner_name, owner_email, emails_to_invite} = request.body;

    if (dayjs(starts_at).isBefore(new Date())) { // se o starts vem antes da data atual
        throw new ClientError("Invalid trip start date");
    }

    if (dayjs(ends_at).isBefore(starts_at)) {
        // se o ends vem antes da data starts
        throw new ClientError("Invalid trip end date");
    }

    const trip = await prisma.trip.create({
        data: {
            destination,
            starts_at,
            ends_at,
            participants: { // cria participant dentro de trip já que possuem relacionamento
                // cria trip apenas quando participant for criado
                createMany: {
                    data: [
                        {
                        name: owner_name,
                        email: owner_email,
                        is_owner: true,
                        is_confirmed: true
                        },
                        ...emails_to_invite.map(email => {
                            return { email }
                        })
                    ]
                }
            }
        },
        include: {
            participants: true
        }
    })

    const formattedStartedDate = dayjs(starts_at).format('LL');
    const formattedEndDate = dayjs(ends_at).format('LL');

    const confirmattionLink = `${env.API_BASE_URL}/trips/${trip.id}/confirm`;

    const mail = await getMailClient();
    const message =  await mail.sendMail({ // envio de email com sendMail(from/to/subject/html)
        from: {
            name: 'Equipe Planner',
            address: 'atendimento@planner.com'
        },
        to: {
            name: owner_name,
            address: owner_email
        },
        subject: `Confirme sua viagem para ${destination} em ${formattedStartedDate}`,
        html: `
        <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
        <p>Você solicitou a criação de uma viagem para <strong>${destination}</strong> nas datas de <strong>${formattedStartedDate}</strong> até <strong>${formattedEndDate}</strong></p>
        <p></p>
        <p>Para confirmar sua viagem, clique no link abaixo:</p>
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

    return { tripId: trip.id}
   })
}