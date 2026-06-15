const jwt = require("jsonwebtoken");

/**
 * Middleware للتحقق من الـ JWT token
 * بيحط بيانات اليوزر في req.user
 */
function authenticate(req, res, next) {
  // الـ token بييجي في الهيدر: Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

/**
 * Middleware للتحقق من الـ role
 * الاستخدام: authorize("PROFESSOR", "MANAGER")
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
