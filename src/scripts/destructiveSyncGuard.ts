// sequelize.sync({ force }) wipes every table and sync({ alter }) drops columns missing
// from the models. The schema is owned by migrations, so these scripts may only touch a
// throwaway local database, and only when explicitly asked to.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function targetHost(): string {
  if (process.env.DATABASE_URL) {
    try {
      return new URL(process.env.DATABASE_URL).hostname;
    } catch {
      return "unparseable DATABASE_URL";
    }
  }
  return process.env.DB_HOST || "localhost";
}

export function assertDestructiveSyncAllowed(scriptName: string): void {
  const host = targetHost();
  const reasons: string[] = [];

  if (process.env.NODE_ENV === "production") {
    reasons.push("NODE_ENV=production");
  }
  if (!LOCAL_HOSTS.has(host)) {
    reasons.push(`hedef veritabanı yerel değil (${host})`);
  }
  if (process.env.ALLOW_DESTRUCTIVE_SYNC !== "1") {
    reasons.push("ALLOW_DESTRUCTIVE_SYNC=1 verilmedi");
  }

  if (reasons.length > 0) {
    console.error(
      `${scriptName} durduruldu: ${reasons.join("; ")}.\n` +
        "Bu script tablo/kolon siler ve sadece yerel, atılabilir bir veritabanında çalışır. " +
        "Şema değişiklikleri için npm run db:migrate kullanın.",
    );
    process.exit(1);
  }
}
