// routes/upload.js
import { Router } from "express";
import upload from "../../middlewares/upload.mjs";
import s3 from "../../utils/s3Client.mjs";
import { Upload } from "@aws-sdk/lib-storage";
import dotenv from "dotenv";
import { deleteFileFromS3 } from "../../utils/deleteFromS3.mjs";

dotenv.config();

const router = Router();

router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { originalname, buffer, mimetype } = req.file;

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `images/${Date.now()}_${originalname}`,
      Body: buffer,
      ContentType: mimetype,
    };

    const parallelUpload = new Upload({
      client: s3,
      params: uploadParams,
    });

    const result = await parallelUpload.done();

    return res.status(200).json({
      message: "Upload successful",
      imageUrl: result.Location,
    });
  } catch (error) {
    console.error("Upload Error:", error);
    return res
      .status(500)
      .json({ message: "Upload failed", error: error.message });
  }
});

router.delete("/delete", async (req, res) => {
  const { key } = req.body;

  if (!key) {
    return res
      .status(400)
      .json({ error: "Key is required to delete the file." });
  }

  const result = await deleteFileFromS3(key);

  if (result.success) {
    res.json({ success: true, message: "File deleted successfully." });
  } else {
    res
      .status(500)
      .json({ error: "Failed to delete file.", details: result.error });
  }
});

export default router;
