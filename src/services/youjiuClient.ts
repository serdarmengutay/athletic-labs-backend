interface ParsedYoujiuQrUrl {
  qrUrl: string;
  reportId: string;
  token: string | null;
  agentId: string | null;
}

interface YoujiuClientOptions {
  measurementId: string;
  token?: string | null;
  agentId?: string | null;
}

const REPORT_ID_KEYS = ["report_id", "reportId", "reportid"];
const TOKEN_KEYS = ["token", "access_token", "auth_token"];
const AGENT_ID_KEYS = ["agent_id", "agentId", "agentid"];

function getUrlValue(
  url: URL,
  keys: string[],
): string | null {
  for (const key of keys) {
    const queryValue = url.searchParams.get(key);
    if (queryValue) {
      return queryValue;
    }
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  for (const key of keys) {
    const hashValue = hashParams.get(key);
    if (hashValue) {
      return hashValue;
    }
  }

  return null;
}

function normalizeOptionalString(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseYoujiuQrUrl(qrUrl: string): ParsedYoujiuQrUrl {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(qrUrl);
  } catch {
    throw new Error("Geçersiz QR URL");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("QR URL yalnızca http/https olabilir");
  }

  let reportId = normalizeOptionalString(getUrlValue(parsedUrl, REPORT_ID_KEYS));

  if (!reportId) {
    const pathMatch = parsedUrl.pathname.match(/(?:report|reports)\/([^/]+)/i);
    reportId = normalizeOptionalString(pathMatch?.[1] ?? null);
  }

  if (!reportId) {
    throw new Error("QR URL içinde report_id bulunamadı");
  }

  return {
    qrUrl: parsedUrl.toString(),
    reportId,
    token: normalizeOptionalString(getUrlValue(parsedUrl, TOKEN_KEYS)),
    agentId: normalizeOptionalString(getUrlValue(parsedUrl, AGENT_ID_KEYS)),
  };
}

let cachedAccessToken: { value: string; expiresAt: number } | null = null;

export class YoujiuApiClient {
  private baseUrl: string;
  private sessionPath: string;
  private reportPathTemplate: string;
  private appId: string | null;
  private appSecret: string | null;
  private acceptLanguage: string;
  private mediaType: string;

  constructor() {
    this.baseUrl =
      process.env.YOUJIU_API_BASE_URL || "https://open.youjiuhealth.com/mch/v3";
    this.sessionPath = process.env.YOUJIU_SESSION_PATH || "/session";
    this.reportPathTemplate =
      process.env.YOUJIU_REPORT_DETAIL_PATH || "/reports/:measurementId";
    this.appId = process.env.YOUJIU_APP_ID || null;
    this.appSecret = process.env.YOUJIU_APP_SECRET || null;
    this.acceptLanguage = process.env.YOUJIU_ACCEPT_LANGUAGE || "tr";
    this.mediaType =
      process.env.YOUJIU_ACCEPT_MEDIA_TYPE || "application/vnd.XoneAPI.v3+json";

    if (!this.appId || !this.appSecret) {
      throw new Error("YOUJIU_APP_ID ve YOUJIU_APP_SECRET tanımlı değil");
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (cachedAccessToken && cachedAccessToken.expiresAt > now + 30_000) {
      return cachedAccessToken.value;
    }

    const sessionUrl = new URL(this.sessionPath, this.baseUrl);
    sessionUrl.searchParams.set("app_id", this.appId!);
    sessionUrl.searchParams.set("app_secret", this.appSecret!);

    const response = await fetch(sessionUrl.toString(), {
      method: "POST",
      headers: {
        Accept: this.mediaType,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Youjiu session hatası (${response.status}): ${errorText || "Boş yanıt"}`,
      );
    }

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!payload.access_token) {
      throw new Error("Youjiu session yanıtında access_token bulunamadı");
    }

    const expiresInMs = Math.max(60, payload.expires_in ?? 3600) * 1000;
    cachedAccessToken = {
      value: payload.access_token,
      expiresAt: now + expiresInMs,
    };

    return payload.access_token;
  }

  async getReportDetail({
    measurementId,
    token,
    agentId,
  }: YoujiuClientOptions): Promise<Record<string, any>> {
    const accessToken = await this.getAccessToken();
    const hasTemplateMeasurementId =
      this.reportPathTemplate.includes(":measurementId");
    const path = hasTemplateMeasurementId
      ? this.reportPathTemplate.replace(
          ":measurementId",
          encodeURIComponent(measurementId),
        )
      : this.reportPathTemplate;
    const url = new URL(path, this.baseUrl);

    if (!hasTemplateMeasurementId) {
      url.searchParams.set("measurementId", measurementId);
    }
    if (token) {
      url.searchParams.set("token", token);
    }
    if (agentId) {
      url.searchParams.set("agent_id", agentId);
    }

    const headers: Record<string, string> = {
      Accept: this.mediaType,
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": this.acceptLanguage,
    };

    if (token) {
      headers["x-youjiu-qr-token"] = token;
    }
    if (agentId) {
      headers["x-youjiu-agent-id"] = agentId;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Youjiu API hatası (${response.status}): ${errorText || "Boş yanıt"}`,
      );
    }

    const data = await response.json();
    return (data ?? {}) as Record<string, any>;
  }
}
