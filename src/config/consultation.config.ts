import { registerAs } from "@nestjs/config";

export interface ConsultationConfig {
  min_reserve_chat_duration_sec: string;
  min_reserve_voice_duration_sec: string;
}

export default registerAs<Partial<ConsultationConfig>>("consultation", () => ({
  min_reserve_chat_duration_sec:
    process.env.MIN_RESERVE_CHAT_DURATION_SEC ?? "60",
  min_reserve_voice_duration_sec:
    process.env.MIN_RESERVE_VOICE_DURATION_SEC ?? "300",
}));
