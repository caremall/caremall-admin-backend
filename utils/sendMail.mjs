import nodeMailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

// __filename is the current file URL converted to a file path
const __filename = fileURLToPath(import.meta.url);

// __dirname is the directory name of the current module file
const __dirname = path.dirname(__filename);

 const sendMail = async (options) => {
  const transporter = nodeMailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    service: process.env.SMTP_SERVICE,
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },

    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const { email, subject, template, mailData } = options;

  const templatePath = path.join(__dirname, "../mails", template);

  try {
    const html = await ejs.renderFile(templatePath, mailData);

    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject,
      html,
    };

     await transporter.sendMail(mailOptions);
  } catch (error) {
   console.error('Mail sending error:', error);
   throw error; 
}
};

export default sendMail;