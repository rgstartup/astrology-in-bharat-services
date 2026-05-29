export interface IUseCase{
  execute<Input, Output>(input: Input): Promise<Output>;
}