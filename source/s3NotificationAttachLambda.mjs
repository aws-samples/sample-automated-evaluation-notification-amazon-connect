

import { send } from "./cfn-response//cfn-response.mjs"; 
const region = process.env.AWS_REGION;
import { S3Client, PutBucketNotificationConfigurationCommand } from "@aws-sdk/client-s3"; 
const client = new S3Client({ region: region });

export const handler = async (event, context) => {
    console.log("INPUT -  ", JSON.stringify(event));
    try {
        if (event.RequestType === 'Create') {
            console.log('Create Request');
            await createBucketNotification(event);
        }
        else if (event.RequestType === 'Delete') {
            console.log('Delete Request - No Update');
        }
        else if (event.RequestType === 'Update') {
            console.log('Update Request  - No Update');
        }
    } catch (error) {
        console.log('Error', error);
        return await send(event, context, 'FAILED', { Error: error.message });
    }
    return await send(event, context, 'SUCCESS', { Message: 'Success' });
};

async function createBucketNotification() {
    const ConnectEvaluationBucket = process.env.ConnectEvaluationBucket;
    const ConnectEvaluationLocation = process.env.ConnectEvaluationLocation;
    const S3EventLambda = process.env.S3EventLambda;

    let lambdConfigurations = [
        {
            Id: "evaluation-notification",
            LambdaFunctionArn: S3EventLambda,
            Events: [
                "s3:ObjectCreated:Put",
            ],
            Filter: {
                Key: {
                    FilterRules: [
                        {
                            Name: "prefix",
                            Value: ConnectEvaluationLocation,
                        },
                        {
                            Name: "suffix",
                            Value: ".json",
                        }
                    ],
                },
            },
        },
    ];
    
    let input = {
        Bucket: ConnectEvaluationBucket,
        NotificationConfiguration: {
            LambdaFunctionConfigurations: lambdConfigurations
        },
    };
    console.log('PutBucketNotificationConfigurationCommand input',JSON.stringify(input));
    const command = new PutBucketNotificationConfigurationCommand(input);
    const response = await client.send(command);
    console.log('PutBucketNotificationConfigurationCommand response',response);
}

