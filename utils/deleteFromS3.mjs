
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import s3 from './s3Client.mjs';

export const deleteFileFromS3 = async (key) => {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
    };

    try {
        const command = new DeleteObjectCommand(params);
        await s3.send(command);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};
