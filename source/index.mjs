import { send } from "./ses/notification.mjs";
import { getEvaluationDataFromS3 } from "./s3/s3client.mjs";
import { getUser } from "./connect/describeUser.mjs";
import { searchhierarchy, searchRole } from "./connect/searchUser.mjs";

export const handler = async (event) => {
    try {
        console.log(`Event: ${JSON.stringify(event)}`);
        let bucket;
        let key;

        if (event && event.Records && event.Records[0] && event.Records[0].s3) {
            bucket = event.Records[0].s3.bucket.name;
            key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
        }

        if (!bucket || !key) {
            returnOutput('No Evaluation Notification - Missing bucket or key in the event');
        }

        let evaluationData = await getEvaluationDataFromS3(bucket, key);

        if (!evaluationData || !evaluationData.questions
            && !evaluationData.metadata.instanceId && !evaluationData.metadata.agentId) {
            returnOutput('No Evaluation Notification - Missing evaluation data or questions');
        }

        const roleQuestion = evaluationData.questions.find(q =>
            q.questionText === process.env.EvaluationFlagToQuestionText
        );
        const targetRole = roleQuestion?.answer.values.find(v => v.selected)?.valueText;

        // Check if "Flag to the Agent?" is set to "Yes"
        const flagToAgentQuestion = evaluationData.questions.find(q =>
            q.questionText === process.env.EvaluationFlagToAgentQuestionText
        );
        const flagToAgent = flagToAgentQuestion?.answer.values.find(v => v.selected)?.valueText === "Yes";

        // Proceed with notification if either a role is selected or flagToAgent is true
        if (!targetRole && !flagToAgent) {
            returnOutput('No Evaluation Notification - No role selected for notification and not flagged to agent');
        }

        // Get Agent Data From Instance
        const agentResponse = await getUser(evaluationData.metadata.instanceId, evaluationData.metadata.agentId);

        if (!agentResponse && !agentResponse.User && !agentResponse.User.IdentityInfo) {
            returnOutput('No Evaluation Notification - Instance Agent Data Not Found');
        }

        const agentName = `${agentResponse.User.IdentityInfo.FirstName} ${agentResponse.User.IdentityInfo.LastName}`;
        const hierarchyGroupId = agentResponse.User.HierarchyGroupId;
    
        let searchResponse;
        // Use hierarchy in Search Yes/No
        console.log('Use hierarchy for notification : ', process.env.UsehierarchyForNotification);
        if(process.env.UsehierarchyForNotification === 'yes'){
            if(hierarchyGroupId){
                searchResponse = await searchhierarchy(hierarchyGroupId, targetRole, evaluationData.metadata.instanceId);
            }else{
                returnOutput('No Evaluation Notification - No hierarchy group found');
            }
        }else{
            searchResponse = await searchRole(targetRole, evaluationData.metadata.instanceId);
        }
        // Search for users based on the hierarchy group ID and role tag
        let usersFound = [];
        if (searchResponse && searchResponse.Users) {
            for (let user of searchResponse.Users) {
                // Get complete user details to access email fields
                const fullUserResponse = await getUser(evaluationData.metadata.instanceId, user.Id);
                if (fullUserResponse && fullUserResponse.User) {
                    const emailAddress = getEmailFromUser(fullUserResponse.User, process.env.EmailFieldSource);
                    if (emailAddress) {
                        usersFound.push({
                            Id: fullUserResponse.User.Id,
                            Username: fullUserResponse.User.Username,
                            EmailAddress: emailAddress
                        });
                    }
                }
            }
        }

        // Add the evaluated agent to the notification list if flagged
        if (flagToAgent && agentResponse.User) {
            const agentEmailAddress = getEmailFromUser(agentResponse.User, process.env.EmailFieldSource);
            if (agentEmailAddress) {
                usersFound.push({
                    Id: agentResponse.User.Id,
                    Username: agentResponse.User.Username,
                    EmailAddress: agentEmailAddress
                });
            }
        }

        console.log('Users to send notification : ', JSON.stringify(usersFound));
        if (usersFound.length > 0) {
            if (!process.env.SENDER_EMAIL) {
                returnOutput('No Evaluation Notification - Sender email environment variable is not set');
            }

            console.log('Sending email notifications to the following users:', usersFound.map(user => user.Username).join(', '));

            const emailData = {
                contactId: evaluationData.metadata.contactId,
                instanceId: evaluationData.metadata.instanceId,
                evaluator: evaluationData.metadata.evaluator,
                evaluationDefinitionTitle: evaluationData.metadata.evaluationDefinitionTitle,
                evaluationSubmitTimestamp: evaluationData.metadata.evaluationSubmitTimestamp,
                agentName: agentName
            };

            for (let user of usersFound) {
                let emailRecipient = user.EmailAddress;
                if(validateEmail(emailRecipient) && validateEmail(process.env.SENDER_EMAIL)){
                    console.log(`Sending email to ${emailRecipient}`);
                    await send(emailRecipient, emailData, process.env.SENDER_EMAIL);
                }else{
                    console.log(`Skipping user ${user.Username} - Invalid email address: ${emailRecipient}`);
                }
            }
        } else {
            returnOutput('No Evaluation Notification - No Agent or Role found to Notify');
        }

    } catch (error) {
        console.error('Error processing evaluation form:', error);
        returnOutput('No Evaluation Notification - Error Scenario');
    }
};

function returnOutput(message) {
    console.log(message);
    return {
        statusCode: 200,
        body: JSON.stringify({ message: message })
    };
}

function getEmailFromUser(user, emailFieldSource) {
    switch (emailFieldSource) {
        case 'Username':
            return user.Username;
        case 'Email':
            return user.IdentityInfo?.Email;
        case 'SecondaryEmail':
            return user.IdentityInfo?.SecondaryEmail;
        default:
            return user.IdentityInfo?.Email; // Default to Email field
    }
}

function validateEmail(email) {
    if (!email) return false;
    
    // Check for standard email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(email)) {
        return true;
    }
    
    // Check for SES domain identity format (more permissive)
    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/;
    return domainPattern.test(email);
}