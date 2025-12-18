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

export const uploadImage = async (dataUri, _filenameHint = 'avatar') => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured')
  }
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: CLOUDINARY_UPLOAD_FOLDER,
    resource_type: 'auto', // allows images/PDFs/etc.
    unique_filename: true, // let Cloudinary generate a unique public_id
    use_filename: false, // don't force the provided name to avoid collisions
    overwrite: false,
  })
  return result?.secure_url || result?.url
}

export default cloudinary
