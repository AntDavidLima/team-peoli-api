FROM node:alpine AS builder

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
