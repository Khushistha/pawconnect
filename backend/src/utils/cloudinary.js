import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

// Only configure if credentials are provided
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Upload base64 image from frontend
 * @param {string} base64String - Base64 encoded image (data:image/... or just base64)
 * @param {string} folder - Cloudinary folder
 * @returns {Promise<{url: string, public_id: string}>}
 */
export async function uploadBase64Image(base64String, folder = 'verification-docs') {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_* environment variables.');
  }

  try {
    const uploadOptions = {
      folder,
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    };

    // Upload base64 string directly
    const uploadResult = await cloudinary.uploader.upload(base64String, uploadOptions);

    return {
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    };
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
}
