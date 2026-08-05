import { describeTransactionalEmailConfiguration } from "../lib/email/config";

const result = describeTransactionalEmailConfiguration(process.env);

console.log(`EMAIL_PROVIDER=${result.provider}`);
console.log(`EMAIL_CONFIGURATION=${result.valid ? "valid" : "invalid"}`);
console.log(`RESEND_WEBHOOK_SECRET=${result.webhookConfigured ? "configured" : "not-configured"}`);
console.log(`RESULT=${result.valid ? "PASS" : "FAIL"}`);

if (!result.valid) process.exitCode = 1;
