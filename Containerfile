FROM registry.access.redhat.com/ubi9/nodejs-24-minimal@sha256:60acc0c7fb3c08b05bcaa0db4e24e850010cb81db0e0d878142fdda99a205713 AS builder
USER 1001
WORKDIR ${APP_ROOT}/repo
COPY --chown=1001:0 . .
ARG GIT_COMMIT
ENV GIT_COMMIT=${GIT_COMMIT}
ARG GIT_TAG
ENV GIT_TAG=${GIT_TAG}
RUN node .yarn/releases/yarn-4.18.0.cjs install --immutable && node .yarn/releases/yarn-4.18.0.cjs build:all

FROM registry.access.redhat.com/ubi9/nginx-124@sha256:6f058ac2c588d7a33ed8f8d76e4a16c0393b3eb840404ef880e3e5f20a49a9af
# Required labels for Red Hat / Enterprise Contract
ARG IMAGE_NAME=migration-planner-agent-ui
ARG IMAGE_VERSION=0.0.0
ARG IMAGE_RELEASE=1
ARG IMAGE_DESCRIPTION="Migration Planner Agent UI"
ARG IMAGE_VENDOR="Red Hat, Inc."
ARG IMAGE_URL=""
ARG IMAGE_DISTRIBUTION_SCOPE=restricted
LABEL com.redhat.component="${IMAGE_NAME}" \
      description="${IMAGE_DESCRIPTION}" \
      distribution-scope="${IMAGE_DISTRIBUTION_SCOPE}" \
      io.k8s.description="${IMAGE_DESCRIPTION}" \
      name="${IMAGE_NAME}" \
      release="${IMAGE_RELEASE}" \
      url="${IMAGE_URL}" \
      vendor="${IMAGE_VENDOR}" \
      version="${IMAGE_VERSION}"
COPY --from=builder ${APP_ROOT}/repo/apps/agent-ui/dist /apps/agent-ui/dist
