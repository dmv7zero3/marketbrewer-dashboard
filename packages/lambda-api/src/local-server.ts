import http from "http";
import crypto from "crypto";
import { URL } from "url";
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

const PORT = parseInt(process.env.LOCAL_API_PORT || "3001", 10);
const SSE_POLL_INTERVAL_MS = parseInt(process.env.LOCAL_SSE_POLL_MS || "3000", 10);
const SSE_HEARTBEAT_MS = parseInt(process.env.LOCAL_SSE_HEARTBEAT_MS || "15000", 10);
const LOCAL_DEFAULT_ORIGINS = ["http://localhost:3002", "http://localhost:3003"];

const existingOrigins = (process.env.CORS_ALLOW_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const mergedOrigins = Array.from(new Set([...existingOrigins, ...LOCAL_DEFAULT_ORIGINS]));
process.env.CORS_ALLOW_ORIGINS = mergedOrigins.join(",");
console.log(`[Local API] CORS_ALLOW_ORIGINS=${process.env.CORS_ALLOW_ORIGINS}`);

type Handler = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyStructuredResultV2 | string>;
let cachedHandler: Handler | null = null;

async function loadHandler(): Promise<Handler> {
  if (!cachedHandler) {
    const mod = await import("./index");
    cachedHandler = mod.handler as Handler;
  }
  return cachedHandler;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function normalizeHeaders(
  headers: http.IncomingHttpHeaders
): Record<string, string> {
  const normalized: Record<string, string> = {};
  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === "string") {
      normalized[key] = value;
    } else if (Array.isArray(value)) {
      normalized[key] = value.join(",");
    }
  });
  return normalized;
}

function buildQueryParams(searchParams: URLSearchParams): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }
  return Object.keys(params).length > 0 ? params : undefined;
}

function normalizeResponse(
  response: APIGatewayProxyStructuredResultV2 | string
): APIGatewayProxyStructuredResultV2 {
  if (typeof response === "string") {
    return { statusCode: 200, body: response };
  }
  return response;
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url || !req.method) {
      res.statusCode = 400;
      res.end("Missing request data");
      return;
    }

    const host = req.headers.host || `localhost:${PORT}`;
    const url = new URL(req.url, `http://${host}`);
    const headers = normalizeHeaders(req.headers);

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", headers.origin || "*");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.end();
      return;
    }

    const streamJobMatch = url.pathname.match(/^\/api\/stream\/jobs\/([^/]+)\/([^/]+)$/);
    if (streamJobMatch && req.method === "GET") {
      const businessId = streamJobMatch[1];
      const jobId = streamJobMatch[2];
      const token = url.searchParams.get("token") || "";

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", headers.origin || "*");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.flushHeaders();

      const buildEvent = (path: string): APIGatewayProxyEventV2 => ({
        version: "2.0",
        routeKey: "$default",
        rawPath: path,
        rawQueryString: "",
        headers: {
          ...headers,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        requestContext: {
          accountId: "local",
          apiId: "local",
          domainName: host,
          domainPrefix: "local",
          requestId: crypto.randomUUID(),
          routeKey: "$default",
          stage: "$default",
          time: new Date().toISOString(),
          timeEpoch: Date.now(),
          http: {
            method: "GET",
            path,
            protocol: "HTTP/1.1",
            sourceIp: req.socket.remoteAddress || "127.0.0.1",
            userAgent: req.headers["user-agent"] || "",
          },
        },
        isBase64Encoded: false,
      });

      let lastPayload = "";
      const sendEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const poll = async () => {
        try {
          const handler = await loadHandler();
          const response = normalizeResponse(
            await handler(buildEvent(`/api/businesses/${businessId}/jobs/${jobId}`))
          );
          if (response.statusCode && response.statusCode >= 400) {
            sendEvent("error", { status: response.statusCode, body: response.body });
            return;
          }
          const payload = response.body || "{}";
          if (payload !== lastPayload) {
            lastPayload = payload;
            sendEvent("job.update", JSON.parse(payload));
          }
        } catch (error) {
          sendEvent("error", { message: error instanceof Error ? error.message : String(error) });
        }
      };

      const pollInterval = setInterval(poll, SSE_POLL_INTERVAL_MS);
      const heartbeatInterval = setInterval(() => {
        res.write(": heartbeat\n\n");
      }, SSE_HEARTBEAT_MS);

      poll().catch(() => undefined);

      req.on("close", () => {
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        res.end();
      });
      return;
    }

    const streamJobsMatch = url.pathname.match(/^\/api\/stream\/businesses\/([^/]+)\/jobs$/);
    if (streamJobsMatch && req.method === "GET") {
      const businessId = streamJobsMatch[1];
      const token = url.searchParams.get("token") || "";

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", headers.origin || "*");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.flushHeaders();

      const buildEvent = (path: string): APIGatewayProxyEventV2 => ({
        version: "2.0",
        routeKey: "$default",
        rawPath: path,
        rawQueryString: "",
        headers: {
          ...headers,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        requestContext: {
          accountId: "local",
          apiId: "local",
          domainName: host,
          domainPrefix: "local",
          requestId: crypto.randomUUID(),
          routeKey: "$default",
          stage: "$default",
          time: new Date().toISOString(),
          timeEpoch: Date.now(),
          http: {
            method: "GET",
            path,
            protocol: "HTTP/1.1",
            sourceIp: req.socket.remoteAddress || "127.0.0.1",
            userAgent: req.headers["user-agent"] || "",
          },
        },
        isBase64Encoded: false,
      });

      let lastPayload = "";
      const sendEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const poll = async () => {
        try {
          const handler = await loadHandler();
          const response = normalizeResponse(
            await handler(buildEvent(`/api/businesses/${businessId}/jobs`))
          );
          if (response.statusCode && response.statusCode >= 400) {
            sendEvent("error", { status: response.statusCode, body: response.body });
            return;
          }
          const payload = response.body || "{}";
          if (payload !== lastPayload) {
            lastPayload = payload;
            sendEvent("jobs.update", JSON.parse(payload));
          }
        } catch (error) {
          sendEvent("error", { message: error instanceof Error ? error.message : String(error) });
        }
      };

      const pollInterval = setInterval(poll, SSE_POLL_INTERVAL_MS);
      const heartbeatInterval = setInterval(() => {
        res.write(": heartbeat\n\n");
      }, SSE_HEARTBEAT_MS);

      poll().catch(() => undefined);

      req.on("close", () => {
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        res.end();
      });
      return;
    }

    const body = await readBody(req);
    const event: APIGatewayProxyEventV2 = {
      version: "2.0",
      routeKey: "$default",
      rawPath: url.pathname,
      rawQueryString: url.search ? url.search.slice(1) : "",
      headers,
      queryStringParameters: buildQueryParams(url.searchParams),
      requestContext: {
        accountId: "local",
        apiId: "local",
        domainName: host,
        domainPrefix: "local",
        requestId: crypto.randomUUID(),
        routeKey: "$default",
        stage: "$default",
        time: new Date().toISOString(),
        timeEpoch: Date.now(),
        http: {
          method: req.method,
          path: url.pathname,
          protocol: "HTTP/1.1",
          sourceIp: req.socket.remoteAddress || "127.0.0.1",
          userAgent: req.headers["user-agent"] || "",
        },
      },
      body: body.length > 0 ? body : undefined,
      isBase64Encoded: false,
    };

    const handler = await loadHandler();
    const response = normalizeResponse(await handler(event));
    res.statusCode = response.statusCode || 200;
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        if (typeof value !== "undefined") {
          res.setHeader(key, String(value));
        }
      });
    }
    if (response.cookies && response.cookies.length > 0) {
      res.setHeader("Set-Cookie", response.cookies);
    }
    res.end(response.body || "");
  } catch (error) {
    console.error("[Local API] Unhandled error", error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`[Local API] Listening on http://localhost:${PORT}`);
});
