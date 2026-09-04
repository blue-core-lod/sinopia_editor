FROM node:24.4.0

COPY package.json .
COPY package-lock.json .

# Install dependencies
RUN npm install --no-optional

# Everything that isn't in .dockerignore ships
COPY . .

# Build the app *within* the container because environment variables are fixed at build-time
RUN npm run build

# docker daemon maps app's port
EXPOSE 8004

CMD ["npm", "start"]
