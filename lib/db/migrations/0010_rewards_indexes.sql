-- Indexes to accelerate rewards summary and pagination
CREATE INDEX IF NOT EXISTS "RewardTransaction_userId_createdAt_idx"
  ON "RewardTransaction" ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "RewardTransaction_userId_id_createdAt_idx"
  ON "RewardTransaction" ("userId", "createdAt" DESC, "id" DESC);


