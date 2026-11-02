import { registerAs } from "@nestjs/config";

export interface AgoraConfig {
  agoraAppId: string;
  agoraAppCertificate: string;
  agoraCustomerId: string;
  agoraCustomerSecret: string;
}

export default registerAs<Partial<AgoraConfig>>("agora", () => ({
  agoraAppId: process.env.AGORA_APP_ID,
  agoraAppCertificate: process.env.AGORA_APP_CERTIFICATE,
  agoraCustomerId: process.env.AGORA_CUSTOMER_ID,
  agoraCustomerSecret: process.env.AGORA_CUSTOMER_SECRET,
}));
