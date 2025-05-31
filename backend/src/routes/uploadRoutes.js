const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateUploadUrl, generateS3Key } = require('../utils/s3');
const logger = require('../utils/logger');

const router = express.Router();

// Get presigned URL for image upload
router.post('/image', asyncHandler(async (req, res) => {
  const { fileName, contentType } = req.body;

  // Validate input
  if (!fileName || !contentType) {
    return res.status(400).json({ error: 'File name and content type are required' });
  }

  // Validate content type
  if (!contentType.startsWith('image/')) {
    return res.status(400).json({ error: 'Only image files are allowed' });
  }

  try {
    const key = generateS3Key(req.user.id, fileName);
    const uploadUrl = await generateUploadUrl(key, contentType);

    logger.debug(`Generated upload URL for ${fileName}`);
    res.json({
      uploadUrl,
      key,
      fileName
    });
  } catch (error) {
    logger.error('Error generating upload URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
}));

// Input validation middleware
const validateUpload = (req, res, next) => {
  const { fileName, contentType } = req.body;

  if (!fileName || typeof fileName !== 'string') {
    return res.status(400).json({ error: 'File name is required' });
  }

  if (!contentType || typeof contentType !== 'string') {
    return res.status(400).json({ error: 'Content type is required' });
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  const ext = fileName.toLowerCase().match(/\.[^.]*$/);
  if (!ext || !allowedExtensions.includes(ext[0])) {
    return res.status(400).json({ error: 'Invalid file type' });
  }

  // Check file name length
  if (fileName.length > 100) {
    return res.status(400).json({ error: 'File name is too long' });
  }

  next();
};

// Apply validation middleware
router.post('/image', validateUpload);

module.exports = router; 