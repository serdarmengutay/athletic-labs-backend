import { QueryTypes, Transaction } from "sequelize";
import sequelize from "../../config/database";

const TC_NO_HASH_PATTERN = /^[0-9a-f]{64}$/;

// Returns only the athlete_id; the hash itself is not handed back to callers.
export async function findAthleteIdByTcNoHash(
  tcNoHash: string,
  options: { transaction?: Transaction } = {},
): Promise<string | null> {
  if (!TC_NO_HASH_PATTERN.test(tcNoHash)) {
    return null;
  }

  const rows = await sequelize.query<{ id: string }>(
    "SELECT id FROM athletes WHERE tc_no_hash = :tcNoHash LIMIT 1",
    {
      replacements: { tcNoHash },
      type: QueryTypes.SELECT,
      transaction: options.transaction,
    },
  );

  return rows[0]?.id ?? null;
}
