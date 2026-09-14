FROM node:24.4.0

# Runtime defaults; override with -e / environment: in compose when deploying
ENV SINOPIA_URI=http://localhost/sinopia
ENV SINOPIA_API_BASE_URL=http://localhost/api

COPY package.json .
COPY package-lock.json .

# Install dependencies
RUN npm install --no-optional

# Everything that isn't in .dockerignore ships
COPY . .

# Build the app
RUN npm run build

# docker daemon maps app's port
EXPOSE 8004

CMD ["npm", "start"]
