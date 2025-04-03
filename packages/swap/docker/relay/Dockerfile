FROM node:22-slim

WORKDIR /app
COPY . /app
RUN yarn install --frozen-lockfile
WORKDIR /app/packages/swap
RUN yarn build

CMD ["yarn", "relay"]