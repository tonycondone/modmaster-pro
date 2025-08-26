const Joi = require('joi');

const validateScrapeRequest = (req, res, next) => {
  const schema = Joi.object({
    platform: Joi.string()
      .valid('amazon', 'ebay', 'autozone', 'summit_racing')
      .required(),
    url: Joi.string().uri().required(),
    forceRefresh: Joi.boolean().optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }

  next();
};

module.exports = {
  validateScrapeRequest,
};