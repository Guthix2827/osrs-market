import cookie from "@fastify/cookie";
import Fastify from "fastify";
import { registerAuthRoutes, } from "./authRoutes.js";
import { config, } from "./config.js";
import { migrateAuthDatabase, pool, removeExpiredAuthData, } from "./database.js";
const app = Fastify({
    logger: true,
    trustProxy: true,
});
await app.register(cookie);
app.addHook("onSend", async (_request, reply) => {
    reply.header("cache-control", "no-store");
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("referrer-policy", "no-referrer");
});
app.get("/auth/health", async () => ({
    status: "ok",
}));
await registerAuthRoutes(app);
await migrateAuthDatabase();
await removeExpiredAuthData();
const cleanupTimer = setInterval(() => {
    void removeExpiredAuthData()
        .catch((error) => {
        app.log.error({
            error,
        }, "Failed to remove expired authentication data");
    });
}, 15 * 60 * 1000);
cleanupTimer.unref();
const shutdown = async () => {
    clearInterval(cleanupTimer);
    await app.close();
    await pool.end();
};
process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
await app.listen({
    host: "0.0.0.0",
    port: config.port,
});
