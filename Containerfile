FROM registry.access.redhat.com/ubi9/nodejs-24-minimal@sha256:9ef91e314a24141d00473a7a89bd4622b61009d17cae81884d54b18558aabc48 AS builder
USER 1001
WORKDIR ${APP_ROOT}/repo
COPY --chown=1001:0 . .
ARG GIT_COMMIT
ENV GIT_COMMIT=${GIT_COMMIT}
ARG GIT_TAG
ENV GIT_TAG=${GIT_TAG}
RUN node .yarn/releases/yarn-4.14.1.cjs install --immutable && node .yarn/releases/yarn-4.14.1.cjs build:all

FROM registry.access.redhat.com/ubi9/nginx-124@sha256:d0dea12c26ab29734d15590f2a931180f68d6c276dffdf9e3f1e8eeb9ab3be59
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
