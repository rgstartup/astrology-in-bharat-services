/**
 * Keeps decorator metadata from eagerly evaluating a circular dependency.
 * Use only with an explicit injection token, such as @Inject(forwardRef(...)).
 */
export type DeferredDependency<T> = T;
