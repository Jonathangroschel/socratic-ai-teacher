-- UserWallet stores verified wallet addresses for airdrops
CREATE TABLE IF NOT EXISTS "UserWallet" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "chain" varchar NOT NULL DEFAULT 'solana',
  "address" text NOT NULL,
  "label" text,
  "isPrimary" boolean NOT NULL DEFAULT false,
  "isVerified" boolean NOT NULL DEFAULT false,
  "createdAt" timestamp NOT NULL,
  "updatedAt" timestamp NOT NULL,
  "lastConnectedAt" timestamp,
  CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id"),
  CONSTRAINT "UserWallet_user_chain_address_unique" UNIQUE ("userId", "chain", "address")
);

CREATE INDEX IF NOT EXISTS "UserWallet_userId_idx" ON "UserWallet" ("userId");
CREATE INDEX IF NOT EXISTS "UserWallet_userId_isPrimary_idx" ON "UserWallet" ("userId", "isPrimary");

-- WalletVerificationNonce stores short-lived nonces for signature verification
CREATE TABLE IF NOT EXISTS "WalletVerificationNonce" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "address" text NOT NULL,
  "nonce" text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL,
  CONSTRAINT "WalletVerificationNonce_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "WalletVerificationNonce_userId_address_idx" ON "WalletVerificationNonce" ("userId", "address");
CREATE INDEX IF NOT EXISTS "WalletVerificationNonce_expiresAt_idx" ON "WalletVerificationNonce" ("expiresAt");


