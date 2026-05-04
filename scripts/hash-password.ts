import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run auth:hash -- '<password>'");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log("\n# Raw hash:");
console.log(hash);
console.log("\n# For LOCAL dev (.env, parsed by Next.js dotenv-expand):");
console.log("ADMIN_PASSWORD_HASH=" + hash.replace(/\$/g, "\\$"));
console.log("\n# For DEPLOY (.env on VPS, parsed by docker compose):");
console.log("ADMIN_PASSWORD_HASH=" + hash.replace(/\$/g, "$$$$"));
console.log("\nCopy dòng phù hợp với môi trường vào .env\n");
