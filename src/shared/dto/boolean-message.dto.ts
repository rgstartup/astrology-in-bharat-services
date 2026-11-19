/**
 * @deprecated Legacy boolean message carrier. Use ApiResponse.ok(true, { message }) directly.
 */
export class BooleanMessage {
  /**
   * Constructs BooleanMessage.
   *
   * @param {boolean} [success=true] - Boolean outcome.
   * @param {string} [message='Operation completed successfully'] - Human readable message.
   */
  constructor(
    public success: boolean = true,
    public message: string = 'Operation completed successfully',
  ) {}
}
