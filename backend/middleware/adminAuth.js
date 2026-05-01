import jwt from "jsonwebtoken";

const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const legacyTokenHeader = req.headers.token;

    const debugEnabled = process.env.AUTH_DEBUG === "true";

    const tokenFromAuthHeader =
      typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice("bearer ".length).trim()
        : null;

    const token =
      tokenFromAuthHeader || (typeof legacyTokenHeader === "string" ? legacyTokenHeader.trim() : null);

    if (debugEnabled) {
      const tokenPreview =
        typeof token === "string" && token.length > 16 ? `${token.slice(0, 10)}…(${token.length})` : token;
      console.log("[adminAuth] headers:", req.headers);
      console.log("[adminAuth] token:", tokenPreview);
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized Login Again",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (debugEnabled) {
      console.log("[adminAuth] decoded:", decoded);
    }

    if (decoded !== process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized Login Again",
      });
    }

    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ success: false, message: error.message });
  }
};

export default adminAuth;
