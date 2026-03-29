try {
  await fetchData();
} catch (e) {
  console.error(e);
  throw e;
}
