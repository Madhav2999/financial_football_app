import { v2 as cloudinary } from 'cloudinary'

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_UPLOAD_FOLDER = 'financial-football',
} = process.env

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  })
}

export const uploadImage = async (dataUri, filenameHint = 'avatar') => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured')
  }
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: CLOUDINARY_UPLOAD_FOLDER,
    resource_type: 'image',
    public_id: filenameHint ? filenameHint.replace(/\s+/g, '-').toLowerCase() : undefined,
    overwrite: false,
  })
  return result?.secure_url || result?.url
}

export default cloudinary
