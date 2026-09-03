FROM registry.access.redhat.com/ubi9/nodejs-24-minimal@sha256:c7b8cb436feace96ca0b43eab7326394893e0ac9c2c6b46895727e3b9202fb9d AS builder
USER 1001
WORKDIR ${APP_ROOT}/repo
COPY --chown=1001:0 . .
ARG GIT_COMMIT
ENV GIT_COMMIT=${GIT_COMMIT}
ARG GIT_TAG
ENV GIT_TAG=${GIT_TAG}
RUN node .yarn/releases/yarn-4.14.1.cjs install --immutable && node .yarn/releases/yarn-4.14.1.cjs build:all

FROM registry.access.redhat.com/ubi9/nginx-124@sha256:bff0f204cfef8af0b21a2e683a9d1231da98a429d856ee29ebd0e2691d919b56
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
