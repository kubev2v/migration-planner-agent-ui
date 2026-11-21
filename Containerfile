FROM registry.access.redhat.com/ubi9/nodejs-24-minimal@sha256:94e1482b6fe50b5a99692d4cea62309b54201f405d12766f2ebe37ab49692f29 AS builder
USER 1001
WORKDIR ${APP_ROOT}/repo
COPY --chown=1001:0 . .
ARG GIT_COMMIT
ENV GIT_COMMIT=${GIT_COMMIT}
ARG GIT_TAG
ENV GIT_TAG=${GIT_TAG}
# Resolve the committed Yarn release from .yarnrc.yml (the source of truth) so this
# stays in sync when the Yarn version is bumped (e.g. by Renovate).
RUN YARN_RELEASE="$(sed -n 's/^yarnPath:[[:space:]]*//p' .yarnrc.yml)" && node "${YARN_RELEASE}" install --immutable && node "${YARN_RELEASE}" build:all

FROM registry.access.redhat.com/ubi9/nginx-124@sha256:6be479e7fc3ee2c7a768927224704e0345a093bd73e79b891724362d67e23e0c
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
