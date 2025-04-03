FROM node:22-slim

WORKDIR /app
COPY . /app
WORKDIR /app/packages/swap
RUN yarn install --frozen-lockfile
RUN yarn build

CMD ["yarn", "relay"]