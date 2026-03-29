try {
  await connectDb();
} catch (e) {
  console.error("DB connection failed, using fallback");
  return fallbackDb();
}
