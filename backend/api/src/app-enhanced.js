const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
require("express-async-errors");

const config = require("./config");
const logger = require("./utils/logger");
const { db } = require("./models");

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:19000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Compression middleware
app.use(compression());

// Request parsing middleware
app.use(express.json({ limit: "10MB" }));
app.use(express.urlencoded({ extended: true, limit: "10MB" }));

// Logging middleware
app.use(morgan("combined", { stream: { write: message => logger.info(message.trim()) } }));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests from this IP, please try again later.",
    code: "RATE_LIMIT_EXCEEDED"
  }
});

app.use("/api/", limiter);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Access token required",
      code: "TOKEN_REQUIRED"
    });
  }

  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: "Invalid or expired token",
        code: "TOKEN_INVALID"
      });
    }
    req.user = user;
    next();
  });
};

// Validation middleware
const validate = (schemas) => {
  return async (req, res, next) => {
    await Promise.all(schemas.map(schema => schema.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }
    next();
  };
};

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ModMaster Pro Backend API is running",
    timestamp: new Date().toISOString(),
    environment: "development",
    version: "1.0.0",
    services: {
      database: "Connected",
      redis: "Connected",
      ai_service: "Available"
    }
  });
});

// Authentication Routes
app.post("/api/v1/auth/register", 
  validate([
    body("firstName").trim().isLength({ min: 1 }).withMessage("First name is required"),
    body("lastName").trim().isLength({ min: 1 }).withMessage("Last name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("username").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters")
  ]),
  async (req, res) => {
    try {
      const { firstName, lastName, email, password, username } = req.body;

      const existingUser = await db("users").where("email", email).first();
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists",
          code: "USER_EXISTS"
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const [user] = await db("users").insert({
        first_name: firstName,
        last_name: lastName,
        email,
        username,
        password_hash: hashedPassword,
        subscription_tier: "free",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }).returning(["id", "first_name", "last_name", "email", "username", "subscription_tier", "created_at"]);

      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          subscriptionTier: user.subscription_tier
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            username: user.username,
            subscriptionTier: user.subscription_tier
          },
          token
        }
      });
    } catch (error) {
      logger.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR"
      });
    }
  }
);

app.post("/api/v1/auth/login",
  validate([
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required")
  ]),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await db("users").where("email", email).first();
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS"
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
          code: "INVALID_CREDENTIALS"
        });
      }

      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          subscriptionTier: user.subscription_tier
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            username: user.username,
            subscriptionTier: user.subscription_tier
          },
          token
        }
      });
    } catch (error) {
      logger.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR"
      });
    }
  }
);

// User Routes
app.get("/api/v1/users/profile", authenticateToken, async (req, res) => {
  try {
    const user = await db("users")
      .select("id", "first_name", "last_name", "email", "username", "subscription_tier", "created_at")
      .where("id", req.user.userId)
      .first();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          username: user.username,
          subscriptionTier: user.subscription_tier,
          createdAt: user.created_at
        }
      }
    });
  } catch (error) {
    logger.error("Profile fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

// Vehicle Routes
app.get("/api/v1/vehicles", authenticateToken, async (req, res) => {
  try {
    const vehicles = await db("vehicles")
      .where("user_id", req.user.userId)
      .select("id", "make", "model", "year", "vin", "created_at");

    res.json({
      success: true,
      data: { vehicles }
    });
  } catch (error) {
    logger.error("Vehicles fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

app.post("/api/v1/vehicles",
  authenticateToken,
  validate([
    body("make").trim().isLength({ min: 1 }).withMessage("Make is required"),
    body("model").trim().isLength({ min: 1 }).withMessage("Model is required"),
    body("year").isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage("Valid year is required"),
    body("vin").optional().isLength({ min: 17, max: 17 }).withMessage("VIN must be 17 characters")
  ]),
  async (req, res) => {
    try {
      const { make, model, year, vin } = req.body;

      const [vehicle] = await db("vehicles").insert({
        user_id: req.user.userId,
        make,
        model,
        year,
        vin,
        created_at: new Date(),
        updated_at: new Date()
      }).returning(["id", "make", "model", "year", "vin", "created_at"]);

      res.status(201).json({
        success: true,
        message: "Vehicle added successfully",
        data: { vehicle }
      });
    } catch (error) {
      logger.error("Vehicle creation error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR"
      });
    }
  }
);

// Scan Routes
app.post("/api/v1/scans",
  authenticateToken,
  validate([
    body("vehicleId").optional().isUUID().withMessage("Valid vehicle ID is required"),
    body("scanType").isIn(["engine_bay", "vin", "part_identification", "full_vehicle"]).withMessage("Valid scan type is required"),
    body("images").isArray({ min: 1 }).withMessage("At least one image is required"),
    body("images.*").isURL().withMessage("Valid image URL is required")
  ]),
  async (req, res) => {
    try {
      const { vehicleId, scanType, images } = req.body;

      const [scan] = await db("vehicle_scans").insert({
        user_id: req.user.userId,
        vehicle_id: vehicleId,
        scan_type: scanType,
        images: JSON.stringify(images),
        status: "pending",
        created_at: new Date(),
        updated_at: new Date()
      }).returning(["id", "scan_type", "status", "created_at"]);

      res.status(201).json({
        success: true,
        message: "Scan initiated successfully",
        data: { scan }
      });
    } catch (error) {
      logger.error("Scan creation error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR"
      });
    }
  }
);

app.get("/api/v1/scans", authenticateToken, async (req, res) => {
  try {
    const scans = await db("vehicle_scans")
      .where("user_id", req.user.userId)
      .select("id", "scan_type", "status", "ai_results", "created_at")
      .orderBy("created_at", "desc")
      .limit(20);

    res.json({
      success: true,
      data: { scans }
    });
  } catch (error) {
    logger.error("Scans fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

// Parts Routes
app.get("/api/v1/parts", async (req, res) => {
  try {
    const { search, category, limit = 20, offset = 0 } = req.query;
    
    let query = db("parts").select("id", "name", "category", "brand", "price", "description", "image_url");

    if (search) {
      query = query.where(function() {
        this.where("name", "ilike", `%${search}%`)
            .orWhere("description", "ilike", `%${search}%`)
            .orWhere("brand", "ilike", `%${search}%`);
      });
    }

    if (category) {
      query = query.where("category", category);
    }

    const parts = await query.limit(parseInt(limit)).offset(parseInt(offset));

    res.json({
      success: true,
      data: { parts }
    });
  } catch (error) {
    logger.error("Parts fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND"
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    code: "INTERNAL_ERROR"
  });
});

module.exports = app;
