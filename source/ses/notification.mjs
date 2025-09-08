import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
const sesClient = new SESClient();

import { getAlias } from "../connect/describe.mjs";

export async function send(emailRecipient, emailData, senderEmail) {

    const { contactId, instanceId, evaluator, evaluationDefinitionTitle, evaluationSubmitTimestamp, agentName } = emailData;
    
    const instanceAlias = await getAlias(instanceId);
    console.log('instanceAlias : ',instanceAlias);

    const contactUrl = `https://${instanceAlias}.my.connect.aws/contact-trace-records/details/${contactId}?tz=America/New_York`;
    console.log('contactUrl : ',contactUrl);
    
    // Handle domain identity format for SES
    const senderAddress = senderEmail.includes('@') ? senderEmail : `noreply@${senderEmail}`;
    
    const emailParams = {
        Source: `"Amazon Connect Evaluations" <${senderAddress}>`,
        Destination: {
            ToAddresses: [emailRecipient]
        },
        ReplyToAddresses: [senderAddress],
        Message: {
            Subject: {
                Data: 'New Contact Evaluation Ready for Review'
            },
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: `
                        <html>
                        <head>
                        <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #f8f9fa; padding: 20px; margin-bottom: 20px; text-align: center; }
                        .logo { max-width: 200px; height: auto; margin-bottom: 15px; }
                        .metadata { color: #000000; font-size: 0.9em; text-align: left; }
                        .button { background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
                        .button:hover { background-color: #0056b3; }
                        .agent-name { color: #004085; font-weight: bold; font-size: 1.1em; }
                        </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h2>Evaluation Form</h2>
                                </div>
                                <div class="content">
                                    <p>A  observation has been completed and requires your review.</p>
                                    <div class="metadata">
                                    <p><strong>Details:</strong></p>
                                    <ul>
                                        <li>Contact ID: ${contactId}</li>
                                        <li>Observation Form: ${evaluationDefinitionTitle}</li>
                                        <li>Observed Agent: <span class="agent-name">${agentName}</span></li>
                                        <li>Submitted by: ${evaluator}</li>
                                        <li>Observation Submission Date: ${new Date(evaluationSubmitTimestamp).toLocaleString('en-US', { 
                                            timeZone: 'America/New_York',
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true 
                                        })} EST</li>
                                    </ul>
                                    </div>
                                    <p style="text-align: center;">
                                        <a href="${contactUrl}" class="button">View Contact Details</a>
                                    </p>
                                    <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
                                        This is an automated message. Please do not reply to this email.
                                    </p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `
                }
            }
        }
    };

    try {
        await sesClient.send(new SendEmailCommand(emailParams));
        console.log(`Email notification sent to ${emailParams.Destination.ToAddresses.length} recipients ✓`);
    } catch (error) {
        console.error('Error sending email notification to:', emailRecipient, 'Error:', error.message);
        throw error;
    }
}
