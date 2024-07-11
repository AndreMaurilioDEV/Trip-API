import nodemailer from 'nodemailer';
// nodemailer - // cria um server sntp ficticio pra envio de email

export async function getMailClient() {
    const account = await nodemailer.createTestAccount(); // usuário

    const transporter = nodemailer.createTransport({ // server ficticio(ethereal) 
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });

    return transporter;
}