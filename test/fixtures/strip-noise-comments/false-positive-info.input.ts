// connect to REPLICA database for read queries
db.connect(replicaUrl);

// retry because upstream is flaky
retry(3);
