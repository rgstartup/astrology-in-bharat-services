export class BooleanMessage {
  constructor(
    public success: boolean = true,
    public message: string = 'Operation completed successfully',
  ) {}
}
