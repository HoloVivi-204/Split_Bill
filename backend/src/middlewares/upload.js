const multer = require("multer");

const env = require("../config/env");
const { AppError } = require("../utils/appError");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_IMAGE_SIZE_MB * 1024 * 1024
  },
  fileFilter: (_request, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(
        new AppError({
          statusCode: 400,
          code: "INVALID_FILE_TYPE",
          message: "File không phải ảnh hợp lệ"
        })
      );
      return;
    }

    callback(null, true);
  }
});

module.exports = {
  upload
};
