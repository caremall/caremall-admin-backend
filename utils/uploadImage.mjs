import { v4 as uuidv4 } from "uuid";
import { PutObjectCommand, s3Client } from "./s3Client.v3.mjs";

// Set your default folder here
const DEFAULT_FOLDER = "images/";

export async function uploadBase64Image(base64Image, folder = DEFAULT_FOLDER) {
  const matches = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!matches) throw new Error("Invalid base64 image format");

  const contentType = matches[1];
  const imageData = Buffer.from(matches[2], "base64");
  const extension = contentType.split("/")[1];

  // Ensure folder ends with slash
  if (folder && !folder.endsWith("/")) folder += "/";

  const fileName = `${folder}${uuidv4()}.${extension}`;

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileName,
    Body: imageData,
    ContentEncoding: "base64",
    ContentType: contentType,
    ACL: "public-read",
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  return `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
}

export async function uploadBase64Images(images, folder = DEFAULT_FOLDER) {
  if (!images) return [];

  if (typeof images === "string") {
    const url = await uploadBase64Image(images, folder);
    return [url];
  }

  if (Array.isArray(images)) {
    const uploadPromises = images.map((img) => uploadBase64Image(img, folder));
    return Promise.all(uploadPromises);
  }

  throw new Error(
    "Invalid images input. Expecting base64 string or array of base64 strings."
  );
}
