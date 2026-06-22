const { Readable } = require("stream");

const { v2: cloudinary } = require("cloudinary");

const env = require("../config/env");

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

async function uploadImage(buffer, folder, publicId) {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: "image",
      ...(publicId ? { public_id: publicId, overwrite: true } : {})
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });

    Readable.from(buffer).pipe(stream);
  });
}

async function deleteImage(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

module.exports = {
  uploadImage,
  deleteImage
};
