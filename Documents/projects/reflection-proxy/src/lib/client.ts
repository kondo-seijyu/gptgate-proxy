import { createClient } from 'microcms-js-sdk';

export function createMicroCMSClient(env: { MICROCMS_SERVICE_DOMAIN: string; MICROCMS_API_KEY: string }) {
  return createClient({
    serviceDomain: env.MICROCMS_SERVICE_DOMAIN,
    apiKey: env.MICROCMS_API_KEY,
  });
}