
export class AgentCreatedEvent {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly agentId: string,
    public readonly password: string,
  ) { }
}

export class SendAgentOtpEvent {
  constructor(
    public readonly email: string,
    public readonly otp: string,
  ) { }
}
