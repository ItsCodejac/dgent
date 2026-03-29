import { readFile } from "fs";

// --- Initialization ---

const config = loadConfig();
const db = connectDb();

// --- Main Logic ---

export function process() {
  return db.query("SELECT 1");
}

// --- Exports ---

export default process;
