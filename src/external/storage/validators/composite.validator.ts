import { Inject, Injectable, Optional } from '@nestjs/common';
import type { IFileValidator } from './validator.interface';
import type { NormalizedUpload } from '../adapters/adapter.interface';
import type { StorageUploadOptions } from '../storage.types';
import { FileSizeValidator } from './file-size.validator';
import { MimeTypeValidator } from './mime-type.validator';

export const COMPOSITE_FILE_VALIDATORS = 'COMPOSITE_FILE_VALIDATORS';

/**
 * GoF Composite Pattern: Composite File Validator
 *
 * Chains multiple validator specifications together and executes them in sequence.
 */
@Injectable()
export class CompositeFileValidator implements IFileValidator {
  readonly name = 'composite';
  private readonly validators: IFileValidator[] = [];

  constructor(
    @Optional()
    @Inject(COMPOSITE_FILE_VALIDATORS)
    validators?: IFileValidator[],
    @Optional()
    fileSizeValidator?: FileSizeValidator,
    @Optional()
    mimeTypeValidator?: MimeTypeValidator,
  ) {
    if (validators && validators.length > 0) {
      this.validators = [...validators];
    } else {
      // Default validation suite: FileSizeValidator + MimeTypeValidator
      this.validators = [
        fileSizeValidator ?? new FileSizeValidator(),
        mimeTypeValidator ?? new MimeTypeValidator(),
      ];
    }
  }

  addValidator(validator: IFileValidator): this {
    this.validators.push(validator);
    return this;
  }

  validate(file: NormalizedUpload, options?: StorageUploadOptions): void {
    for (const validator of this.validators) {
      validator.validate(file, options);
    }
  }
}
