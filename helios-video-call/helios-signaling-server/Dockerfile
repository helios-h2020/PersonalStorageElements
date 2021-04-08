FROM node:13-alpine

# Grant necessary permission into node_module and app folders to execute npm install
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /home/node/app

COPY package*.json ./

USER node

RUN npm install

COPY --chown=node:node . .

EXPOSE 1794

CMD [ "node", "index.js" ]