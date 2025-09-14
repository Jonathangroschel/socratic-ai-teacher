-- Ensure single active nonce per user+address
CREATE UNIQUE INDEX IF NOT EXISTS "WalletVerificationNonce_user_address_unique"
  ON "WalletVerificationNonce" ("userId", "address");


