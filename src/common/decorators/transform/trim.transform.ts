import { Transform } from 'class-transformer';

const TrimString = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export default TrimString;
