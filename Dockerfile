FROM node:alpine as builder

WORKDIR /tmp/team-peoli-api

COPY package*.json .

RUN npm install --only-dev

COPY . .

RUN npm run build

FROM node:alpine

WORKDIR /usr/src/team-peoli-api

RUN mkdir dist
RUN mkdir prisma

COPY --from=builder /tmp/team-peoli-api/dist dist
COPY --from=builder /tmp/team-peoli-api/prisma prisma
COPY --from=builder /tmp/team-peoli-api/package*.json .
COPY --from=builder /tmp/team-peoli-api/.env .

RUN npm install --only-prod 

EXPOSE 3000

CMD npx prisma migrate deploy;npm run start:prod
