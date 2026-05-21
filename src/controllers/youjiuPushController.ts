import { Request, Response } from "express";
import { YoujiuPushLog } from "../models";

const REPORT_ID_KEYS = [
  "report_id",
  "reportId",
  "reportid",
  "measurement_id",
  "measurementId",
  "measurementid",
  "id",
];
const DEVICE_SN_KEYS = ["device_sn", "deviceSn", "deviceSN", "sn", "SN"];
const MERCHANT_KEYS = ["merchant", "merchantName", "merchant_name", "mch", "mchName"];

function isPlainObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function findFirstValue(source: unknown, keys: string[]): string | null {
  const wantedKeys = new Set(keys.map(normalizeKey));
  const queue: unknown[] = [source];

  while (queue.length > 0) {
    const current = queue.shift();
    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    if (!isPlainObject(current)) continue;

    for (const [key, value] of Object.entries(current)) {
      if (wantedKeys.has(normalizeKey(key))) {
        if (value !== null && value !== undefined && String(value).trim()) {
          return String(value).trim();
        }
      }
      if (isPlainObject(value) || Array.isArray(value)) {
        queue.push(value);
      }
    }
  }

  return null;
}

function hasValidIngestToken(req: Request): boolean {
  const expectedToken = process.env.YOUJIU_PUSH_INGEST_TOKEN;
  if (!expectedToken) return true;

  const providedToken =
    req.query.token ||
    req.headers["x-athletic-labs-youjiu-token"] ||
    req.headers["x-youjiu-token"];

  return String(providedToken || "") === expectedToken;
}

export const receiveYoujiuReportPush = async (req: Request, res: Response) => {
  try {
    if (!hasValidIngestToken(req)) {
      return res.status(401).json({
        success: false,
        code: 401,
        msg: "invalid token",
      });
    }

    const rawPayload = isPlainObject(req.body) ? req.body : { payload: req.body };
    const reportId = findFirstValue(rawPayload, REPORT_ID_KEYS);
    const deviceSn = findFirstValue(rawPayload, DEVICE_SN_KEYS);
    const merchant = findFirstValue(rawPayload, MERCHANT_KEYS);

    const log = await YoujiuPushLog.create({
      report_id: reportId,
      device_sn: deviceSn,
      merchant,
      status: "received",
      raw_payload: rawPayload,
      request_headers: req.headers,
      received_at: new Date(),
    });

    console.log("Youjiu push received", {
      logId: log.id,
      reportId,
      deviceSn,
      merchant,
    });

    return res.status(200).json({
      success: true,
      code: 0,
      msg: "success",
      data: {
        id: log.id,
        reportId,
      },
    });
  } catch (error) {
    console.error("receiveYoujiuReportPush error:", error);
    return res.status(500).json({
      success: false,
      code: 500,
      msg: "failed",
    });
  }
};
