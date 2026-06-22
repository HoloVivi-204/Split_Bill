const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");

const env = require("./config/env");
const { swaggerUi, swaggerDocument } = require("./config/swagger");
const { apiLimiter } = require("./middlewares/rateLimit");
const { requestIdMiddleware } = require("./middlewares/requestId");
const { notFoundMiddleware } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorHandler");
const { buildSuccessResponse } = require("./utils/apiResponse");
const { sepayWebhookRouter } = require("./webhooks/sepay");
const apiRouter = require("./routes");

function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true
    })
  );
  app.use("/api/webhooks", sepayWebhookRouter);
  app.use(express.json({ limit: env.JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(env.COOKIE_SECRET));

  app.get("/health", (_request, response) => {
    response.status(200).json(
      buildSuccessResponse({
        status: "ok",
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString()
      })
    );
  });

  app.get("/docs.json", (_request, response) => {
    response.status(200).json(swaggerDocument);
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.use("/api", apiLimiter, apiRouter);
  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp
};
