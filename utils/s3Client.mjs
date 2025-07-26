// utils/s3Client.js
import { S3Client } from '@aws-sdk/client-s3';
import { configDotenv } from 'dotenv';


configDotenv()


const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    endpoint:
        `https://s3.${process.env.AWS_REGION}.amazonaws.com`,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

export default s3Client;

