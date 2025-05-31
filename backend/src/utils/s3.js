const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('./logger');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Generate a presigned URL for uploading a file to S3
 * @param {string} key - The S3 object key
 * @param {string} contentType - The file's content type
 * @returns {Promise<string>} The presigned URL
 */
const generateUploadUrl = async (key, contentType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY
    });

    logger.debug('Generated S3 upload URL', { key, contentType });
    return signedUrl;
  } catch (error) {
    logger.error('Error generating S3 upload URL', {
      error: error.message,
      key,
      contentType
    });
    throw error;
  }
};

/**
 * Generate a presigned URL for downloading a file from S3
 * @param {string} key - The S3 object key
 * @returns {Promise<string>} The presigned URL
 */
const generateDownloadUrl = async (key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY
    });

    logger.debug('Generated S3 download URL', { key });
    return signedUrl;
  } catch (error) {
    logger.error('Error generating S3 download URL', {
      error: error.message,
      key
    });
    throw error;
  }
};

/**
 * Delete a file from S3
 * @param {string} key - The S3 object key
 * @returns {Promise<void>}
 */
const deleteFile = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
    logger.debug('Deleted file from S3', { key });
  } catch (error) {
    logger.error('Error deleting file from S3', {
      error: error.message,
      key
    });
    throw error;
  }
};

/**
 * Generate a unique S3 key for a file
 * @param {string} userId - The user's ID
 * @param {string} fileName - The original file name
 * @returns {string} The S3 key
 */
const generateS3Key = (userId, fileName) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  return `uploads/${userId}/${timestamp}-${randomString}-${fileName}`;
};

module.exports = {
  generateUploadUrl,
  generateDownloadUrl,
  deleteFile,
  generateS3Key
}; 