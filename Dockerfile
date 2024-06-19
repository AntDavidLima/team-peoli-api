FROM node:21-alpine as BUILDER

WORKDIR /tmp/team-peoli-api

COPY package*.json .

RUN npm install --only-dev

COPY . .

RUN npm run build

FROM node:21-alpine

WORKDIR /usr/src/team-peoli-api

RUN mkdir dist
RUN mkdir prisma

COPY --from=BUILDER /tmp/team-peoli-api/dist dist
COPY --from=BUILDER /tmp/team-peoli-api/prisma prisma
COPY --from=BUILDER /tmp/team-peoli-api/package*.json .

RUN npm install --only-prod

EXPOSE 3000

CMD npx prisma migrate deploy;npm run start:prod
