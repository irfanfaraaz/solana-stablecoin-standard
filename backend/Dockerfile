# Build context must be repo root. Run `anchor build` before `docker compose build` so target/idl exists.
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY sdk/ sdk/
COPY backend/ backend/
COPY target/idl target/idl

RUN cd sdk && yarn install && yarn build
RUN cd backend && yarn install && yarn build

FROM node:20-bookworm-slim
WORKDIR /app
COPY --from=builder /app/sdk sdk
COPY --from=builder /app/backend backend
COPY --from=builder /app/target target
COPY --from=builder /app/backend/node_modules backend/node_modules
COPY --from=builder /app/backend/dist backend/dist

ENV WORKSPACE_ROOT=/app
ENV PORT=3000
EXPOSE 3000
WORKDIR /app/backend
CMD ["node", "dist/app.js"]
