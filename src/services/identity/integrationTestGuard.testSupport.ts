// DB integration tests write rows, so they are opt-in and refuse the production URL.

function databaseHost(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function dbIntegrationSkipReason(): string | false {
  const devHost = databaseHost(process.env.DATABASE_URL);
  const prodHost = databaseHost(process.env.PROD_DATABASE_URL);

  if (process.env.RUN_DB_INTEGRATION_TESTS !== "1") {
    return "RUN_DB_INTEGRATION_TESTS=1 değil";
  }
  if (!devHost) {
    return "DATABASE_URL tanımlı değil";
  }
  if (devHost === prodHost) {
    return "DATABASE_URL production veritabanını gösteriyor";
  }
  return false;
}
