## 🌟 Astrology in Bharat - Backend Service

This is the core backend service for the **Astrology in Bharat** platform, built using **NestJS**. It follows a modular architecture with clean separation of concerns, utilizing the **Facade Pattern** to manage communication between different business domains.

## 🏗️ Core Module Logic & Architecture

### 🛡️ Astrologer (Expert) Lifecycle Flow
The platform treats Astrologers as "Experts" with a dedicated onboarding and verification pipeline.

1. **Authentication & Initial Profile**: 
   - Experts register via `AuthController`.
   - The `ExpertAuthProfileCreationStrategy` automatically creates a shell profile in the `profile_experts` table upon successful registration.
2. **Segmented Onboarding (`src/modules/expert/profile`)**:
   - **Personal Info**: Updates identity, bio, languages, and profile picture (via Cloudinary).
   - **Pricing**: Experts set their own per-minute rates for Chat, Call, Video Calls, and fixed prices for Reports.
   - **Portfolio**: Uploading intro videos (30-90s validation) and gallery images.
   - **KYC & Documents**: Uploading Aadhar/PAN and professional certificates for verification.
3. **Verification & Visibility**:
   - Profiles start with `kyc_status: 'pending'`.
   - Admin verifies documents and updates status to `'approved'` or `'active'`.
   - **Visibility Logic**: The `listExperts` query filters for active/available experts to show on the frontend.
4. **Services & Products**:
   - **Products**: Experts manage their own astrology items via `ExpertProductController`.
   - **Consultation**: Real-time interaction via `ChatGateway` and `CallGateway`.
5. **Earnings & Payouts**:
   - Consultation fees are credited to the expert's wallet.
   - `WalletFacade` handles the calculation of expert earnings per session.
### 👑 Admin Management Flow (`src/modules/admin`)
The Admin Panel serves as the central control unit for the platform.

1. **User & Expert Oversight**:
   - **Verification**: Admin reviews uploaded documents from Experts and Agents to approve/reject profiles (KYC).
   - **Entity Management**: CRUD operations for Users, Experts, and Agents.
2. **Economic Control**:
   - **Payouts (`src/modules/wallet/application/payouts`)**: Approving payout requests from Experts.
   - **Refunds & Disputes**: Processing wallet refunds for failed or disputed consultations.
   - **Commissions**: Configuring global platform fees and individual commission rates.
3. **Commerce & Content**:
   - **Product Moderation**: Reviewing and managing product listings across the store.
   - **Service Catalog**: Defining consultation categories (Vedic, Tarot, etc.) and global pricing guidelines.
4. **Resolution & Feedback**:
   - **Review Management**: Overseeing and moderating consultation ratings.

### 🤝 Agent Management Flow (`src/modules/agent`)
Agents act as intermediaries or regional managers on the platform.

1. **Onboarding**: Agents go through a similar registration and KYC verification process as experts.
2. **Asset Management**: 
   - Agents are assigned to manage specific sets of expert listings or product categories.
   - They handle high-volume data entries (e.g., bulk product uploads).
3. **Incentives**:
   - Agents earn commissions based on the activity and verification status of the experts they manage.


- **Controllers:** `AuthController`, `GoogleAuthController`
- **Logic:**
  - **Registration:** Creates a new `User` entity and sends a verification link via email.
  - **Email Verification:** Ensures email ownership before login is permitted.
  - **Login:** Supports **JWT-based email/password** and **Google OAuth2**.
  - **Access Tokens:** Short-lived JWTs containing basic user info and roles (`userId`, `role`, `roles`).
  - **Refresh Tokens:**
    - Long-lived random hex strings (64 bytes).
    - **Storage:** Hashed using **Argon2** and stored in the `sessions` database table.
    - **Format:** Sent to the client as `${sessionId}.${rawToken}`.
    - **Rotation:** When a token is refreshed, the old session is revoked and a entirely new pair of tokens is issued.
  - **Roles:** Prioritized role mapping (`admin` > `agent` > `expert` > `client`).
  - **Security:** Argon2 for passwords and token hashes; JWT for stateless authorization.
  - **Password Recovery:** `forgot-password` and `reset-password` logic.


### 2. User Profile Management (`src/modules/client/profile`)
- **Controller:** `ProfileController`
- **Logic:**
  - Manages the creation and updating of user profile data.
  - Handles **profile picture uploads** using integrated storage solutions.
  - Stores essential user information such as **Date of Birth**, which is used in astrology calculations.

### 3. Wallet & Transaction Engine (`src/modules/wallet`)
- **Controller:** `WalletController`
- **Facade:** `WalletFacade`
- **Logic:**
  - **Balance Management:** All consultation payments and product purchases are handled through this module.
  - **Transactions:** Maintains a detailed record of every credit (recharge) and debit (consultation/purchase).
  - **Validation:** The `WalletFacade` ensures atomic transactions and validates balance before any deduction.

### 4. Consultation Engine (`src/modules/chat` & `src/modules/call`)
- **Controllers:** `ConsultationController`, `ChatController`, `CallController`
- **Logic:**
  - **Booking:** The `book-with-wallet` endpoint in the `Chat` module connects the Wallet to the consultation, ensuring the user has sufficient funds.
  - **Session Management:** The `ChatFacade` handles the state of real-time chat sessions.
  - **Consultation Modes:** Supports standard chat, voice calls, and video calls.
  - **Free Trial Management:**
    - **Logic:** Instead of a simple boolean flag on the user entity, the system checks the `chat_sessions` history.
    - **Eligibility:** A user is eligible if they have **zero** completed sessions (`status: ChatSessionStatus.COMPLETED`). Once the first trial session completes, the user is no longer eligible.
    - **Configuration:** Controlled via `FREE_CHAT_ENABLED` (global toggle) and `FREE_CHAT_DURATION_MINS` (typically set to 2 or 5 minutes) in environment variables.
    - **Wallet Bypass:** For eligible free trials, the standard minimum balance requirement (reservation) is skipped, allowing users to start the chat with a zero balance.
    - **Session State:** The session is marked with `is_free: true` and `free_minutes` which is then used by the real-time clock to manage termination.

  - **Real-time Communication (`src/modules/chat`, `src/modules/call`)**:
    - **WebSockets**: Utilizes `@WebSocketGateway` for real-time chat messaging and call signaling.
    - **State Management**: The backend manages active session states (PENDING, ACTIVE, COMPLETED) and broadcasts updates to both clients and experts.
    - **Notifications**: Integrated notification gateways to alert experts of incoming chat/call requests instantly.

### 5. E-commerce & Orders (`src/modules/product`, `src/modules/order`)
- **Controllers:** `ProductController`, `OrderController`
- **Logic:**
  - **Product Listing:** Managed via the `ProductModule`, allowing users to browse and filter items.
  - **Ordering:** The `OrderController` handles the checkout process, integrating with the `WalletModule` for payments and the `CartModule` for item management.
  - **Order History:** Provides users with a full log of their product purchases and delivery statuses.

### 6. Payment & External Integrations (`src/external`)
- **Providers:** Razorpay (Payments & Payouts), Gmail (SMTP)
- **Logic:**
  - **Razorpay Integration:** Handles order creation, payment verification, and automated webhooks for both incoming user payments and expert payouts.
  - **SMTP:** Integrated with Gmail for delivering registration OTP links, verification emails, and password reset instructions.
  - **Webhooks:** Dedicated controllers handle asynchronous updates from Razorpay to finalize orders or credits.


### 7. Storage & Assets (`src/external/cloudinary`)
- **Service:** `CloudinaryService`
- **Logic:**
  - **Dynamic Uploads:** Handles profile picture and product image uploads directly to Cloudinary.
  - **Streaming:** Uses stream-based uploading to support large files without consuming heavy server memory.
  - **Multimedia:** Automatically detects and handles both image and video uploads.

### 8. Database & Persistence (`src/core/database`)
- **ORM:** TypeORM
- **Strategy:**
  - **Migrations:** Uses TypeORM migrations to ensure schema consistency across environments.
  - **Transactions:** Complex business logic (like processing orders and wallet debits) is wrapped in atomic database transactions.
  - **Entities:** Cleanly mapped domain models for Users, Sessions, Wallets, Products, and Orders.

## 🚀 Key Technologies
- **Framework:** NestJS
- **Language:** TypeScript
- **ORM:** TypeORM
- **Auth:** JWT and Google OAuth2
- **Infrastructure:** Modular/Facade Architecture


## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

---

## 👨‍💻 Author

- **Name** - Ravi Rai
- **GitHub** - [Ravi5612](https://github.com/Ravi5612)
- **Email** - [ravirai84272@gmail.com](mailto:ravirai84272@gmail.com)

