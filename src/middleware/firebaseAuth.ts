import { Request, Response, NextFunction } from "express";
import { admin } from "../config/firebase";

// Extend Express Request to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    // TODO: Add role/permissions fields when role-based access is needed
  };
}

/**
 * Firebase Authentication Middleware
 * Verifies Firebase ID token from Authorization header
 *
 * @description
 * - Reads token from "Authorization: Bearer <token>" header
 * - Verifies token with Firebase Admin SDK
 * - Attaches user info (uid, email) to req.user
 * - Returns 401 if token is missing/invalid/expired
 */
export const authenticateFirebase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header("Authorization");

    // Check if Authorization header exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is required",
        code: "AUTH_HEADER_MISSING",
      });
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format. Use: Bearer <token>",
        code: "AUTH_FORMAT_INVALID",
      });
    }

    // Extract token
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is required",
        code: "TOKEN_MISSING",
      });
    }

    // Verify token with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      // TODO: Add custom claims for roles when needed
      // role: decodedToken.role,
    };

    return next();
  } catch (error: any) {
    console.error("Firebase auth error:", error.code || error.message);

    // Handle specific Firebase errors
    if (error.code === "auth/id-token-expired") {
      return res.status(401).json({
        success: false,
        message: "Token has expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
    }

    if (error.code === "auth/id-token-revoked") {
      return res.status(401).json({
        success: false,
        message: "Token has been revoked. Please login again.",
        code: "TOKEN_REVOKED",
      });
    }

    if (error.code === "auth/argument-error") {
      return res.status(401).json({
        success: false,
        message: "Invalid token format",
        code: "TOKEN_INVALID",
      });
    }

    // Generic error for other cases
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      code: "AUTH_FAILED",
    });
  }
};

/**
 * Optional authentication middleware
 * Does not block requests without token, but attaches user if token is valid
 * Useful for routes that work for both authenticated and anonymous users
 */
export const optionalAuthenticateFirebase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token, continue without user info
      return next();
    }

    const token = authHeader.replace("Bearer ", "");

    if (token) {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
      };
    }

    return next();
  } catch (error) {
    // Token invalid, but continue without user (optional auth)
    return next();
  }
};
