const nodemailer = require('nodemailer');
// Create email transporter that uses Gmail SMTP with App Password
const createTransporter = async () => {
    // We require an app-specific password to send via Gmail SMTP.
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        throw new Error('EMAIL_USER and EMAIL_PASSWORD must be set to use SMTP app-password authentication');
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

// Format date and time for display
const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata'
    };
    return date.toLocaleString('en-IN', options);
};

// Send appointment scheduled notification to client
const sendAppointmentNotification = async (clientEmail, meetingDetails) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.warn('⚠️ Email credentials not configured. Skipping email notification.');
            return { success: false, message: 'Email not configured' };
        }

        if (!clientEmail) {
            console.warn('⚠️ Client email not provided. Cannot send notification.');
            return { success: false, message: 'Client email not provided' };
        }

        const { clientName, expertName, expertEmail, startTime, endTime, duration} = meetingDetails;

        const transporter = await createTransporter();

        const mailOptions = {
            from: `"Relai Expert Consultation" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: clientEmail,
            subject: 'Your Expert Consultation Appointment is Confirmed',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .header {
                            background-color: #4CAF50;
                            color: white;
                            padding: 20px;
                            text-align: center;
                            border-radius: 5px 5px 0 0;
                        }
                        .content {
                            background-color: white;
                            padding: 30px;
                            border-radius: 0 0 5px 5px;
                        }
                        .details {
                            background-color: #f0f0f0;
                            padding: 15px;
                            border-left: 4px solid #4CAF50;
                            margin: 20px 0;
                        }
                        .details-row {
                            padding: 8px 0;
                            border-bottom: 1px solid #ddd;
                        }
                        .details-row:last-child {
                            border-bottom: none;
                        }
                        .label {
                            font-weight: bold;
                            color: #555;
                        }
                        .footer {
                            text-align: center;
                            padding: 20px;
                            color: #777;
                            font-size: 12px;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 30px;
                            background-color: #4CAF50;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Appointment Confirmed!</h1>
                        </div>
                        <div class="content">
                            <p>Dear ${clientName},</p>

                            <p>Your expert consultation appointment has been successfully scheduled. We look forward to helping you with your real estate needs.</p>

                            <div class="details">
                                <div class="details-row">
                                    <span class="label">Expert:</span> ${expertName}
                                </div>
                                <div class="details-row">
                                    <span class="label">Date & Time:</span> ${formatDateTime(startTime)}
                                </div>
                                <div class="details-row">
                                    <span class="label">Duration:</span> ${duration} minutes
                                </div>
                                <div class="details-row">
                                    <span class="label">Expert Email:</span> ${expertEmail}
                                </div>
                            </div>

                            <p><strong>What to prepare:</strong></p>
                            <ul>
                                <li>Your property requirements and preferences</li>
                                <li>Budget details</li>
                                <li>Any specific questions you have</li>
                                <li>Your preferred locations</li>
                            </ul>

                            <p>If you need to reschedule or have any questions, please contact us at ${process.env.EMAIL_FROM}</p>

                            <p>Best regards,<br>
                            <strong>Relai Expert Team</strong></p>
                        </div>
                        <div class="footer">
                            <p>This is an automated message. Please do not reply directly to this email.</p>
                            <p>&copy; ${new Date().getFullYear()} Relai. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Dear ${clientName},

Your expert consultation appointment has been successfully scheduled.

Appointment Details:
- Expert: ${expertName}
- Date & Time: ${formatDateTime(startTime)}
- Duration: ${duration} minutes
- Expert Email: ${expertEmail}

What to prepare:
- Your property requirements and preferences
- Budget details
- Any specific questions you have
- Your preferred locations

If you need to reschedule or have any questions, please contact us at ${process.env.EMAIL_FROM || process.env.EMAIL_USER}

Best regards,
Relai Expert Team
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };

        } catch (error) {
        console.error('❌ Error sending email:', error);
        return { success: false, error: error.message };
    }
};

// Send reminder email (can be used for future reminders)
const sendAppointmentReminder = async (clientEmail, meetingDetails) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.warn('⚠️ Email credentials not configured. Skipping reminder email.');
            return { success: false, message: 'Email not configured' };
        }

        const { clientName, expertName, startTime, duration } = meetingDetails;

        const transporter = await createTransporter();

        const mailOptions = {
            from: `"Relai Expert Consultation" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: clientEmail,
            subject: 'Reminder: Your Expert Consultation is Tomorrow',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
                        .content { padding: 30px; background-color: #fff; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Appointment Reminder</h1>
                        </div>
                        <div class="content">
                            <p>Dear ${clientName},</p>
                            <p>This is a friendly reminder that you have an expert consultation scheduled for tomorrow.</p>
                            <p><strong>Date & Time:</strong> ${formatDateTime(startTime)}</p>
                            <p><strong>Expert:</strong> ${expertName}</p>
                            <p><strong>Duration:</strong> ${duration} minutes</p>
                            <p>We look forward to meeting with you!</p>
                            <p>Best regards,<br>Relai Expert Team</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Dear ${clientName},

This is a friendly reminder that you have an expert consultation scheduled for tomorrow.

Date & Time: ${formatDateTime(startTime)}
Expert: ${expertName}
Duration: ${duration} minutes

We look forward to meeting with you!

Best regards,
Relai Expert Team
        `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Reminder email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Error sending reminder email:', error);
        return { success: false, error: error.message };
    }
};

// Send a generic/custom email - subject, text/html can be provided
const sendCustomEmail = async (toEmail, { subject = 'Message from Relai', text = '', html = '', from = process.env.EMAIL_FROM || process.env.EMAIL_USER } = {}) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.warn('⚠️ Email credentials not configured. Skipping custom email.');
            return { success: false, message: 'Email not configured' };
        }

        if (!toEmail) {
            console.warn('⚠️ Recipient email not provided. Cannot send custom email.');
            return { success: false, message: 'Recipient email not provided' };
        }

        const transporter = await createTransporter();

        const mailOptions = {
            from,
            to: toEmail,
            subject,
            text,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Custom email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Error sending custom email:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendAppointmentNotification,
    sendAppointmentReminder
    , sendCustomEmail
};
