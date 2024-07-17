ARG APPLICATION_PORT
ARG ENCRYPTION_ROUNDS
ARG JWT_PRIVATE_KEY
ARG JWT_PUBLIC_KEY
ARG CLIENT_URL
ARG DATABASE_URL

FROM node:alpine AS builder

ENV APPLICATION_PORT=$APPLICATION_PORT
ENV ENCRYPTION_ROUNDS=$ENCRYPTION_ROUNDS
ENV JWT_PRIVATE_KEY=$JWT_PRIVATE_KEY
ENV JWT_PUBLIC_KEY=$JWT_PUBLIC_KEY
ENV CLIENT_URL=$CLIENT_URL
ENV DATABASE_URL=$DATABASE_URL

WORKDIR /tmp/team-peoli-api

COPY package*.json .

RUN npm install --only-dev

COPY . .

RUN npm run build

FROM node:21-alpine

WORKDIR /usr/src/team-peoli-api

RUN mkdir dist
RUN mkdir prisma

COPY --from=builder /tmp/team-peoli-api/dist dist
COPY --from=builder /tmp/team-peoli-api/prisma prisma
COPY --from=builder /tmp/team-peoli-api/package*.json .

RUN npm install --only-prod

RUN npx prisma generate

EXPOSE 3000

CMD npx prisma migrate deploy;npm run start:prod
