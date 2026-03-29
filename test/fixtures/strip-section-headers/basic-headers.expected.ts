import { readFile } from "fs";

const config = loadConfig();
const db = connectDb();

export function process() {
  return db.query("SELECT 1");
}

export default process;
