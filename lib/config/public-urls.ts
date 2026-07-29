const DEFAULT_MARKETING_URL = "https://flipschedule.com.br";
const DEFAULT_APP_URL = "https://app.flipschedule.com.br";
const DEFAULT_SUPPORT_EMAIL = "atendimento@flipschedule.com.br";

export const publicUrls = Object.freeze({
  marketingUrl: process.env.NEXT_PUBLIC_MARKETING_URL || DEFAULT_MARKETING_URL,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL,
});

export const { marketingUrl, appUrl, supportEmail } = publicUrls;
