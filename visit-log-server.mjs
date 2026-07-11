import { createServer } from "node:http";
import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 8787);
const HTML_FILE = "C:\\Users\\affan\\Downloads\\invested_onlookers_v2.html";
const LOG_FILE = path.join(__dirname, "visit-log.jsonl");

function sendJson(res, statusCode, body) {
    res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
}

function getClientIp(req) {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string" && forwardedFor.trim()) {
        return forwardedFor.split(",")[0].trim();
    }

    return req.socket.remoteAddress || "unknown";
}

const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/") {
        try {
            const html = await readFile(HTML_FILE, "utf8");
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(html);
        } catch (error) {
            sendJson(res, 500, { error: "Failed to load HTML page." });
        }
        return;
    }

    if (req.method === "POST" && req.url === "/api/log-visit") {
        let rawBody = "";

        req.on("data", chunk => {
            rawBody += chunk;
        });

        req.on("end", async () => {
            try {
                const payload = rawBody ? JSON.parse(rawBody) : {};
                const logEntry = {
                    timestamp: new Date().toISOString(),
                    ip: getClientIp(req),
                    page: payload.page || "",
                    referrer: payload.referrer || "",
                    deviceType: payload.deviceType || "",
                    screenResolution: payload.screenResolution || "",
                    language: payload.language || "",
                    userAgent: payload.userAgent || ""
                };

                await appendFile(LOG_FILE, `${JSON.stringify(logEntry)}\n`, "utf8");
                sendJson(res, 200, { ok: true });
            } catch (error) {
                sendJson(res, 400, { error: "Failed to log visit." });
            }
        });

        return;
    }

    sendJson(res, 404, { error: "Not found." });
});

server.listen(PORT, () => {
    console.log(`Visit logger running at http://localhost:${PORT}`);
    console.log(`Serving page from ${HTML_FILE}`);
    console.log(`Writing logs to ${LOG_FILE}`);
});
