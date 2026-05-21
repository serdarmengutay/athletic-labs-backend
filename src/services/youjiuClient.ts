interface ParsedYoujiuQrUrl {
  qrUrl: string;
  measurementId: string | null;
  reportQuery: YoujiuReportQuery;
  token: string | null;
  agentId: string | null;
  h5Report: YoujiuH5ReportContext | null;
}

interface YoujiuReportQuery {
  phone?: string;
  device_sn?: string;
  attachment_id?: string;
  client_id?: string;
  attachment_rom?: string;
}

interface YoujiuH5ReportContext {
  origin: string;
  reportType: string | null;
  weightUnit: string | null;
  lengthUnit: string | null;
  timezone: string | null;
  timezoneFormat: string | null;
}

interface YoujiuClientOptions {
  measurementId?: string | null;
  reportQuery?: YoujiuReportQuery;
  token?: string | null;
  agentId?: string | null;
  h5Report?: YoujiuH5ReportContext | null;
}

const MEASUREMENT_ID_KEYS = [
  "measurementId",
  "measurement_id",
  "measurementid",
  "measurement",
  "meas_id",
  "report_id",
  "reportId",
  "reportid",
  "id",
];
const REPORT_QUERY_KEYS: Array<keyof YoujiuReportQuery> = [
  "phone",
  "device_sn",
  "attachment_id",
  "client_id",
  "attachment_rom",
];
const TOKEN_KEYS = ["token", "access_token", "auth_token"];
const AGENT_ID_KEYS = ["agent_id", "agentId", "agentid"];
const H5_REPORT_HOSTS = [
  "mini-fit-butler-client-g.youjiuhealth.com",
  "transfer-web-g.youjiuhealth.com",
];

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

  const rawHash = url.hash.replace(/^#/, "");
  const hashQuery = rawHash.includes("?") ? rawHash.split("?").slice(1).join("?") : rawHash;
  for (const params of [new URLSearchParams(rawHash), new URLSearchParams(hashQuery)]) {
    for (const key of keys) {
      const hashValue = params.get(key);
      if (hashValue) {
        return hashValue;
      }
    }
  }

  return null;
}

function getUrlValueByAliases(url: URL, key: string): string | null {
  const aliases = [key, key.replace(/_/g, ""), key.replace(/_([a-z])/g, (_, letter) => String(letter).toUpperCase())];
  return getUrlValue(url, aliases);
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

  let measurementId = normalizeOptionalString(
    getUrlValue(parsedUrl, MEASUREMENT_ID_KEYS),
  );

  if (!measurementId) {
    const pathMatch = parsedUrl.pathname.match(
      /(?:report|reports|measurement|measurements)\/([^/?#]+)/i,
    );
    measurementId = normalizeOptionalString(pathMatch?.[1] ?? null);
  }

  const reportQuery = REPORT_QUERY_KEYS.reduce<YoujiuReportQuery>(
    (query, key) => {
      const value = normalizeOptionalString(getUrlValueByAliases(parsedUrl, key));
      if (value) {
        query[key] = value;
      }
      return query;
    },
    {},
  );

  if (!measurementId && Object.keys(reportQuery).length === 0) {
    throw new Error(
      "QR URL içinde measurementId veya Youjiu rapor arama parametresi bulunamadı",
    );
  }

  return {
    qrUrl: parsedUrl.toString(),
    measurementId,
    reportQuery,
    token: normalizeOptionalString(getUrlValue(parsedUrl, TOKEN_KEYS)),
    agentId: normalizeOptionalString(getUrlValue(parsedUrl, AGENT_ID_KEYS)),
    h5Report: H5_REPORT_HOSTS.some((host) => parsedUrl.hostname.endsWith(host))
      ? {
          origin: parsedUrl.origin,
          reportType: normalizeOptionalString(getUrlValue(parsedUrl, ["type"])),
          weightUnit: normalizeOptionalString(
            getUrlValue(parsedUrl, ["weight_type", "weight_unit"]),
          ),
          lengthUnit: normalizeOptionalString(
            getUrlValue(parsedUrl, ["length_type", "length_unit"]),
          ),
          timezone: normalizeOptionalString(getUrlValue(parsedUrl, ["timezone"])),
          timezoneFormat: normalizeOptionalString(
            getUrlValue(parsedUrl, ["timezone_format"]),
          ),
        }
      : null,
  };
}

let cachedAccessToken: { value: string; expiresAt: number } | null = null;

function buildYoujiuUrl(path: string, baseUrl: string): URL {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.replace(/^\/+/, "");
  return new URL(normalizedPath, normalizedBaseUrl);
}

export class YoujiuApiClient {
  private baseUrl: string;
  private sessionPath: string;
  private reportPathTemplate: string;
  private appId: string | null;
  private appSecret: string | null;
  private acceptLanguage: string;
  private mediaType: string;
  private debug: boolean;

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
    this.debug = process.env.YOUJIU_DEBUG === "true";

    if (!this.appId || !this.appSecret) {
      throw new Error("YOUJIU_APP_ID ve YOUJIU_APP_SECRET tanımlı değil");
    }
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (cachedAccessToken && cachedAccessToken.expiresAt > now + 30_000) {
      return cachedAccessToken.value;
    }

    const sessionUrl = buildYoujiuUrl(this.sessionPath, this.baseUrl);
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

  private buildAuthHeaders(accessToken: string): Record<string, string> {
    return {
      Accept: this.mediaType,
      Authorization: `Bearer ${accessToken}`,
      "Accept-Language": this.acceptLanguage,
    };
  }

  private async parseJsonResponse(response: Response): Promise<Record<string, any>> {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `Youjiu API hatası (${response.status}): ${text || "Boş yanıt"}`,
      );
    }

    if (!text) return {};
    try {
      return JSON.parse(text) as Record<string, any>;
    } catch {
      throw new Error(`Youjiu API JSON olmayan yanıt döndürdü: ${text}`);
    }
  }

  private shouldTryH5Fallback(error: unknown, h5Report?: YoujiuH5ReportContext | null) {
    if (!h5Report) return false;
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes("Youjiu API hatası (400)") ||
      message.includes("Youjiu API hatası (404)") ||
      message.includes("\"code\":42011") ||
      message.includes("报告不存在") ||
      message.toLowerCase().includes("report does not exist") ||
      message.toLowerCase().includes("report not found")
    );
  }

  private getH5ApiPrefixes(reportType?: string | null): string[] {
    const normalizedType = (reportType || "").toLowerCase();
    const preferred = ["u-plus", "xone-max", "biacn"].includes(normalizedType)
      ? "/u-api"
      : "/api";
    return preferred === "/u-api" ? ["/u-api", "/api"] : ["/api", "/u-api"];
  }

  private async getH5ReportDetail({
    measurementId,
    token,
    agentId,
    h5Report,
  }: {
    measurementId: string;
    token: string;
    agentId?: string | null;
    h5Report: YoujiuH5ReportContext;
  }): Promise<Record<string, any>> {
    let lastError: unknown = null;

    for (const prefix of this.getH5ApiPrefixes(h5Report.reportType)) {
      const url = new URL(
        `${prefix}/report/${encodeURIComponent(measurementId)}`,
        h5Report.origin,
      );
      url.searchParams.set("encoded", "1");
      url.searchParams.set("weight_unit", h5Report.weightUnit || "kg");
      url.searchParams.set("length_unit", h5Report.lengthUnit || "cm");
      url.searchParams.set("timezone", h5Report.timezone || "undefined");
      if (h5Report.timezoneFormat) {
        url.searchParams.set("timezone_format", h5Report.timezoneFormat);
      }
      url.searchParams.set(
        "agent_id",
        agentId || process.env.YOUJIU_DEFAULT_AGENT_ID || "3",
      );

      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: token,
            "Accept-Language": this.acceptLanguage,
          },
        });
        const payload = await this.parseJsonResponse(response);
        if (payload.code !== undefined && payload.code !== 0) {
          throw new Error(`Youjiu H5 API hatası: ${JSON.stringify(payload)}`);
        }
        return payload;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Youjiu H5 API yanıtı alınamadı");
  }

  private async findReportMeasurementId(
    accessToken: string,
    reportQuery: YoujiuReportQuery,
  ): Promise<{ measurementId: string; listPayload: Record<string, any> }> {
    const url = buildYoujiuUrl("/reports", this.baseUrl);
    for (const [key, value] of Object.entries(reportQuery)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.buildAuthHeaders(accessToken),
    });
    const listPayload = await this.parseJsonResponse(response);
    const firstReport = Array.isArray(listPayload.data)
      ? listPayload.data[0]
      : null;
    const measurementId =
      firstReport?.measurement?.id ??
      firstReport?.id ??
      firstReport?.measurementId ??
      firstReport?.measurement_id ??
      null;

    if (!measurementId) {
      throw new Error(
        "Youjiu /reports yanıtında measurement id bulunamadı",
      );
    }

    return {
      measurementId: String(measurementId),
      listPayload,
    };
  }

  async getReportDetail({
    measurementId,
    reportQuery,
    token,
    agentId,
    h5Report,
  }: YoujiuClientOptions): Promise<Record<string, any>> {
    const accessToken = await this.getAccessToken();
    let resolvedMeasurementId = measurementId || null;
    let listPayload: Record<string, any> | null = null;

    if (!resolvedMeasurementId && reportQuery && Object.keys(reportQuery).length > 0) {
      const foundReport = await this.findReportMeasurementId(accessToken, reportQuery);
      resolvedMeasurementId = foundReport.measurementId;
      listPayload = foundReport.listPayload;
    }

    if (!resolvedMeasurementId) {
      throw new Error("Youjiu measurementId bulunamadı");
    }

    const hasTemplateMeasurementId =
      this.reportPathTemplate.includes(":measurementId");
    const path = hasTemplateMeasurementId
      ? this.reportPathTemplate.replace(
          ":measurementId",
          encodeURIComponent(resolvedMeasurementId),
        )
      : this.reportPathTemplate;
    const url = buildYoujiuUrl(path, this.baseUrl);

    if (!hasTemplateMeasurementId) {
      url.searchParams.set("measurementId", resolvedMeasurementId);
    }
    if (token) {
      url.searchParams.set("token", token);
    }
    if (agentId) {
      url.searchParams.set("agent_id", agentId);
    }

    const headers: Record<string, string> = this.buildAuthHeaders(accessToken);

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

    let detailPayload: Record<string, any>;
    try {
      detailPayload = await this.parseJsonResponse(response);
    } catch (error) {
      if (this.shouldTryH5Fallback(error, h5Report) && token) {
        detailPayload = await this.getH5ReportDetail({
          measurementId: resolvedMeasurementId,
          token,
          agentId,
          h5Report: h5Report!,
        });
      } else {
        throw error;
      }
    }
    if (this.debug) {
      console.log("Youjiu report import debug", {
        measurementId: resolvedMeasurementId,
        usedReportQuery: reportQuery,
        hadListPayload: Boolean(listPayload),
        usedH5Fallback: Boolean(detailPayload?.result),
      });
    }

    return detailPayload ?? listPayload ?? {};
  }
}
