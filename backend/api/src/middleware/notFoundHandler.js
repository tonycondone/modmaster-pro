const { NotFoundError } = require('./errorHandler');

const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.url} not found`);
  next(error);
};

module.exports = notFoundHandler;