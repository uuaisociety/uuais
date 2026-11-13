# syntax=docker/dockerfile:1
# Railway builds with this file only while the service variable
# RAILWAY_DOCKERFILE_PATH=deploy/railway.Dockerfile is set; otherwise it uses Railpack.
# It exists because Railpack downloads its tooling from GitHub, so a GitHub outage
# blocks every build. See docs/railway-hosting.md.

FROM node:24-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Public values inlined into the client bundle. Railway passes a service variable to the
# build only when it is declared here.
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_PARTNERS_PAGE

# lib/auth-config.ts and lib/firebase-admin.ts throw at import without these, but no
# prerendered output needs them, so the build gets throwaway values and real secrets never
# enter it. The four seeded pages build with an empty seed and pick up real data on their
# first revalidation (15 min); the live Firestore listeners fill them in before that.
RUN AUTH_COOKIE_SIGNATURE_KEY_CURRENT=build-only-not-a-secret \
    AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS=build-only-not-a-secret \
    FIREBASE_CLIENT_EMAIL=build-only@invalid.iam.gserviceaccount.com \
    FIREBASE_PRIVATE_KEY="$(node -e "process.stdout.write(require('node:crypto').generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'}))")" \
    npm run build \
 && rm -rf .next/cache \
 && npm prune --omit=dev

FROM node:24-slim
WORKDIR /app
# The heap cap makes V8 collect garbage before it grows to its default limit (525 MB in
# Railway's 1 GB container), since Railway bills for memory. A fresh server uses about
# 330 MB in total, heap included. It lives here rather than in a service variable because
# Railpack passes service variables to `next build`, which needs a bigger heap.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=320
# Owned by the runtime user so ISR can write regenerated pages under .next.
COPY --from=build --chown=node:node /app ./
USER node
# next start listens on $PORT (Railway sets it) on 0.0.0.0.
CMD ["node_modules/.bin/next", "start"]
