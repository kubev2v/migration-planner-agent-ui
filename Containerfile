FROM registry.access.redhat.com/ubi9/nodejs-24-minimal@sha256:e76548c58c4a29907cef1e01cb6a4cab426eb071ffe28ac1f25dd58d14a89569 AS builder
USER 1001
WORKDIR ${APP_ROOT}/repo
COPY --chown=1001:0 . .
ARG GIT_COMMIT
ENV GIT_COMMIT=${GIT_COMMIT}
ARG GIT_TAG
ENV GIT_TAG=${GIT_TAG}
RUN node .yarn/releases/yarn-4.12.0.cjs install --immutable && node .yarn/releases/yarn-4.12.0.cjs build:all

FROM registry.access.redhat.com/ubi9/nginx-124@sha256:708952e886f448dfd0b4739fa80655cc15954326a117b855adfb670520f594d3
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
