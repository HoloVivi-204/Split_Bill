const multer = require("multer");
const { ZodError } = require("zod");

const { AppError } = require("../utils/appError");

function errorHandler(error, request, response, _next) {
  if (error instanceof ZodError) {
    return response.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu đầu vào không hợp lệ",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        })),
        request_id: request.id
      }
    });
  }

  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        request_id: request.id
      }
    });
  }

  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return response.status(400).json({
      success: false,
      error: {
        code: "FILE_TOO_LARGE",
        message: "File vuot qua gioi han kich thuoc",
        request_id: request.id
      }
    });
  }

  console.error(error);

  return response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Lỗi hệ thống, vui lòng thử lại sau",
      request_id: request.id
    }
  });
}

module.exports = {
  errorHandler
};
