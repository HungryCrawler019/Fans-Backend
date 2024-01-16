FROM node:20.9.0-alpine3.18 AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
ADD .yarn ./.yarn
COPY package.json yarn.lock* .yarnrc.yml ./
RUN YARN_ENABLE_GLOBAL_CACHE=false yarn install --immutable-cache

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN \
  yarn prisma generate && \
  yarn build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN apk add --no-cache gcompat && \
	 addgroup --system --gid 1001 nodejs && \
	 adduser --system --uid 1001 app && \
	 echo -e '#!/bin/sh\ncd /app\nSERVICES=cli node index.js $@' > /usr/bin/fyp-cli && \
	 chmod +x /usr/bin/fyp-cli

COPY --from=builder --chown=app:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=app:nodejs /app/dist ./
COPY --from=builder --chown=app:nodejs /app/package.json ./
COPY --from=builder --chown=app:nodejs /app/web/emailTemplates/styles.css ./web/emailTemplates/styles.css

USER app

EXPOSE 3000

CMD ["node", "index.js"]
