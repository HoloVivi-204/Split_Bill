const info = {
  title: "SplitBill Backend API",
  version: "0.1.0",
  description:
    "In-repo Swagger stub for the current SplitBill backend surface. Use API.md as the canonical contract source of truth."
};

const servers = [
  {
    url: "/api"
  }
];

const tags = [
  { name: "Health" },
  { name: "Auth" },
  { name: "Groups" },
  { name: "Invitations" },
  { name: "Expenses" },
  { name: "Banks" },
  { name: "Fund" },
  { name: "Chat" },
  { name: "Notifications" },
  { name: "Stats" },
  { name: "Webhooks" }
];

const components = {
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT"
    }
  },
  schemas: {
    SuccessEnvelope: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        data: { type: "object" }
      }
    },
    ErrorEnvelope: {
      type: "object",
      properties: {
        success: { type: "boolean", example: false },
        error: {
          type: "object",
          properties: {
            code: { type: "string" },
            message: { type: "string" },
            request_id: { type: "string" }
          }
        }
      }
    }
  }
};

module.exports = {
  components,
  info,
  servers,
  tags
};
