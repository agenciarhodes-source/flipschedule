import "server-only";
export function assertSafeWorkerEnvironment(){const url=process.env.DATABASE_URL??"";const production=process.env.NODE_ENV==="production"||/prod(uction)?|neon\.tech/i.test(url);if(production&&process.env.ALLOW_PRODUCTION_WORKER!=="true")throw new Error("PRODUCTION_WORKER_CONFIRMATION_REQUIRED")}
