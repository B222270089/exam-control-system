import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongoUri: required("MONGO_URI"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  adminSeedName: process.env.ADMIN_SEED_NAME || "System Admin",
  adminSeedEmail: process.env.ADMIN_SEED_EMAIL || "admin@example.com",
  adminSeedPassword: process.env.ADMIN_SEED_PASSWORD || "Admin12345!",
  microsoft: {
    clientId: process.env.MS_CLIENT_ID || "",
    tenantId: process.env.MS_TENANT_ID || "",
    clientSecret: process.env.MS_CLIENT_SECRET || "",
    redirectUri: process.env.MS_REDIRECT_URI || "http://localhost:5000/api/student/microsoft/callback"
  },
  allowDevStudentLogin: process.env.ALLOW_DEV_STUDENT_LOGIN === "true",
  enforceTeamsAccess: process.env.ENFORCE_TEAMS_ACCESS !== "false",
  allowOpenDevAccess: process.env.ALLOW_OPEN_DEV_ACCESS === "true",
  uploadDir: process.env.UPLOAD_DIR || "uploads"
};
