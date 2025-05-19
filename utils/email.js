const nodemailer = require('nodemailer');
const { convert } = require('html-to-text');
const pug = require('pug');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Razvan Ionescu <${process.env.EMAIL_FROM}>`;
  }

  transport() {
    if (process.env.NODE_ENV.trim() === 'production') {
      return nodemailer.createTransport({
        // service: 'Brevo',
        host: process.env.BREVO_HOST,
        port: process.env.BREVO_PORT,
        auth: {
          user: process.env.BREVO_LOGIN,
          pass: process.env.BREVO_SMTPKEY
        }
      });
    }

    // Create a transporter
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(template, subject) {
    // 1. Render the HTML template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject: subject
    });

    // 2. Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html: html,
      text: convert(html)
    };

    // 3. Create a transport and send the email
    await this.transport().sendMail(mailOptions);
  }

  async sendWelcome() {
    // Send an welcome email
    await this.send('welcome', 'Welcome to the Premium Excursion Bookings!');
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'Your Password Reset Token (valid for 10min)');
  }

  async sendVerifyEmail() {
    await this.send('verifyEmail', 'Verify your email');
  }
};
