const nodemailer = require('nodemailer');

// Email configuration
const emailConfig = {
    service: "gmail",
    auth: {
        user: "vykanand@gmail.com",
        pass: "brqj ftms ktah jyqk",
    },
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

async function sendEmail(subject, body) {
    try {
        const mailOptions = {
            from: emailConfig.auth.user,
            to: emailConfig.auth.user,
            subject: subject,
            text: body,
        };

        await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully');
    } catch (error) {
        console.error('❌ Error sending email:', error);
    }
}

module.exports = { sendEmail };
