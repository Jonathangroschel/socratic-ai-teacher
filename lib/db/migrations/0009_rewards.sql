CREATE TABLE IF NOT EXISTS "RewardTransaction" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "chatId" uuid,
  "messageId" uuid,
  "amount" integer NOT NULL,
  "rubric" jsonb,
  "reason" text,
  "createdAt" timestamp NOT NULL,
  CONSTRAINT "RewardTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id"),
  CONSTRAINT "RewardTransaction_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id"),
  CONSTRAINT "RewardTransaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message_v2"("id")
);


