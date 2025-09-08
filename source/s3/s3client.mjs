import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
const s3Client = new S3Client({ region: process.env.AWS_REGION });

export async function getEvaluationDataFromS3(bucket, key) {
  let evaluationData;
  try {
    const s3Response = await s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }));

    if (s3Response && s3Response.Body) {
      evaluationData = JSON.parse(await s3Response.Body.transformToString());
    }
  } catch (error) {
    console.error('Error getting instance alias:', error);
  }
  return evaluationData;
}