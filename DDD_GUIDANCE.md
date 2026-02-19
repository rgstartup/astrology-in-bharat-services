# Domain-Driven Design (DDD) & Clean Architecture Guidance

This project follows a structured Domain-Driven Design (DDD) and Clean Architecture pattern to ensure modularity, testability, and clear separation of concerns. This document serves as a guide for developers to understand and implement new features within this architecture.

## 1. Directory Structure

Each module (e.g., `expert/profile`, `client/profile`) is organized into four distinct layers:

```text
src/modules/[module-name]/
├── api/                  
│   └── controllers/      # HTTP Controllers
├── application/          # Application Layer
│   ├── use-cases/        # Granular Business Logic - one class per api endpoint
│   ├── event-handlers/   # Asynchronous Side Effects
│   └── [module].facade.ts # Entry Point for the module
├── domain/           
│   ├── errors/           # Domain-specific Exceptions - error message telling business rule is violated
│   ├── policies/         # Business Rules & Assertions - tell what is not allowed
│   └── events/           # Domain Event Definitions
└── infrastructure/      # Infrastructure Layer
    └── persistence/      # TypeORM Entities & DTOs & Repositories
```

---

## 2. Layers Responsibility

### 🏛️ API Layer (`api/`)
The interface for external consumers (e.g., REST API).
- **Controllers**: Handle HTTP requests, call the **Facade**, and return responses.
- **Rules**: Should NOT contain business logic. Only handles request parsing and response formatting.

### ⚙️ Application Layer (`application/`)
Orchestrates business processes.
- **Use Cases**: Single-responsibility classes that implement a specific business action.
- **Facade**: A centralized service that acts as the single entry point for the API layer. It coordinates multiple use cases.
- **Event Handlers**: React to domain events to handle side effects (e.g., sending emails, updating cache).

### 🧠 Domain Layer (`domain/`)
The heart of the module. Pure business logic.
- **Policies**: Static classes containing business rules (e.g., `ProfilePolicy.ensureCanUpdate`).
- **Errors**: Specialized errors (extending `DomainError`) providing clear codes and HTTP statuses.
- **Events**: Simple objects describing "something that happened" (e.g., `ProfileUpdatedEvent`).
- **Note**: In our current implementation, domain models directly utilize infrastructure entities to reduce boilerplate.

### 💾 Infrastructure Layer (`infrastructure/`)
External dependencies and state persistence.
- **Entities**: TypeORM database models.
- **Persistence DTOs**: Data structures used for database operations.

---

## 3. Core Patterns

### Use Case Pattern
Every operation (Create, Update, Get) should be its own Use Case.
```typescript
@Injectable()
export class UpdateProfileUseCase {
  async execute(userId: number, data: any) {
    // 1. Fetch Entity
    // 2. Validate with Policy
    // 3. Perform Logic
    // 4. Save
    // 5. Emit Event
  }
}
```

### Domain Policies
Centralize validation logic to avoid duplication.
```typescript
export class ProfilePolicy {
  static ensureExists(profile: Profile | null): asserts profile is Profile {
    if (!profile) throw new ProfileNotFoundError();
  }
}
```

### Event-Driven Side Effects
Decouple secondary actions (like logging or emails) from core logic.
```typescript
// In Use Case
this.eventEmitter.emit('profile.updated', new ProfileUpdatedEvent(userId));

// In Event Handler
@OnEvent('profile.updated')
async handle(event: ProfileUpdatedEvent) {
  await this.mailService.sendNotification(event.userId);
}
```

---

## 4. Key Rules to Follow

1.  **Strict Layering**: No layer should depend on a layer "above" it.
2.  **Facade Only**: Controllers should only interact with the `Facade`, never with `UseCases` directly.
3.  **Snake Case in DB**: Use `snake_case` for database columns and TypeORM entity fields where applicable.
4.  **No Logic in Entities**: Entities should be primarily data structures; logic belongs in Use Cases or Policies.
5.  **Domain Errors**: Always throw a `DomainError` for business violations instead of generic `BadRequestException`.
