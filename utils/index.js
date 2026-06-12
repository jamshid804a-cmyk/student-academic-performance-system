import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

const pool = mysql.createPool({
    host: "acela.proxy.rlwy.net",
    port: 24740,
    user: "root",
    password: "zoqaEdIiQnZvgsbggFowIUvGWDZXlRJk",
    database: "railway",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 60000,
});

export const db = drizzle(pool);