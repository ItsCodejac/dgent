try {
  await fetchData();
} catch (e) {
  console.error("Failed to fetch user data:", e);
  metrics.increment("fetch_error");
  throw new AppError("Data fetch failed", { cause: e });
}
