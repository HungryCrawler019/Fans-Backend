-- AddForeignKey
ALTER TABLE "gem_transactions" ADD CONSTRAINT "gem_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
