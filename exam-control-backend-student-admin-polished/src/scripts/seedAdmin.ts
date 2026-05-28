import bcrypt from "bcryptjs";
import { connectDatabase } from "../config/database";
import { env } from "../config/env";
import { Admin } from "../models/Admin.model";

async function seed() {
  await connectDatabase();
  const passwordHash = await bcrypt.hash(env.adminSeedPassword, 12);
  const admin = await Admin.findOneAndUpdate(
    { email: env.adminSeedEmail.toLowerCase() },
    { name: env.adminSeedName, email: env.adminSeedEmail.toLowerCase(), passwordHash },
    { upsert: true, new: true }
  );
  console.log(`Admin ready: ${admin.email}`);
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
