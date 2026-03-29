// Initialize the configuration handler
const configHandler = new ConfigurationHandler();

class DataProcessor {
  process(data: string) {
    return data;
  }
}

try {
  await run();
} catch (e) {
  console.error(e);
  throw e;
}

export default DataProcessor;
