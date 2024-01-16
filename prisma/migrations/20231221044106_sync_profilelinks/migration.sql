UPDATE profiles SET "profileLink" = (SELECT "username" FROM users WHERE users.id = profiles."userId");
