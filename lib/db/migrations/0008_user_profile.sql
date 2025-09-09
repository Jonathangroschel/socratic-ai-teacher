CREATE TABLE IF NOT EXISTS "UserProfile" (
  "userId" uuid PRIMARY KEY NOT NULL,
  "onboardingCompleted" boolean NOT NULL DEFAULT false,
  "interests" jsonb,
  "goals" jsonb,
  "timeBudgetMins" integer NOT NULL DEFAULT 30,
  "level" varchar NOT NULL DEFAULT 'beginner',
  "createdAt" timestamp NOT NULL,
  "updatedAt" timestamp NOT NULL,
  CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
);


