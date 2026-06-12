import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./utils/schema.js",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: "acela.proxy.rlwy.net",
    port: 24740,
    user: "root",
    password: "zoqaEdIiQnZvgsbggFowIUvGWDZXlRJk",
    database: "railway",
  },
});