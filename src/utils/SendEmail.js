import nodemailer from "nodemailer";
import { WebsiteSetting } from "../Modules/WebsiteSetting/websitesetting.model.js";

const sendEmail = async (options) => {
  const websiteSetting = await WebsiteSetting.findOne();
  if (!websiteSetting || !websiteSetting.smtpConfig) {
    throw new Error("SMTP settings are not configured.");
  }

  const { host, port, username, password, fromEmail } =
    websiteSetting.smtpConfig;
  const transporter = nodemailer.createTransport({
    service: host,
    port,
    auth: {
      user: username,
      pass: password,
    },
  });

  const mailOptions = {
    from: fromEmail,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;
