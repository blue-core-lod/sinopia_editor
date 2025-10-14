FROM node:16.8

# Allow build-time arguments (for, environment variables that need to be encoded into the webpack distribution)
ARG USE_FIXTURES
ARG SINOPIA_API_BASE_URL=http://localhost/api
ARG SINOPIA_URI=http://localhost/sinopia
ARG SINOPIA_ENV=bluecore
ARG INDEX_URL
ARG EXPORT_BUCKET_URL
ARG KEYCLOAK_URL
ARG SEARCH_HOST

# Set environment variables from the build args
ENV INDEX_URL=$INDEX_URL
ENV KEYCLOAK_URL=$KEYCLOAK_URL
ENV SINOPIA_URI=$SINOPIA_URI
ENV SINOPIA_API_BASE_URL=$SINOPIA_API_BASE_URL
ENV SEARCH_HOST=$SEARCH_HOST

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
