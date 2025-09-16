const helmet = require("helmet");

const securityMiddleware = (app) => {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["self"],
        styleSrc: ["self", "unsafe-inline"],
        scriptSrc: ["self"],
        imgSrc: ["self", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
};

module.exports = securityMiddleware;
