import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run auth:hash -- '<password>'");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
const escaped = hash.replace(/\$/g, "\\$");
console.log("\nADMIN_PASSWORD_HASH=" + escaped + "\n");
console.log("Copy dòng trên vào file .env (đã tự escape các ký tự '$')\n");
