import { Transform } from 'class-transformer';

const ToBoolean = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value;
  });

export default ToBoolean;
