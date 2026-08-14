import {
  Alert,
  Button,
  Content,
  Flex,
  FlexItem,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";
import { ExclamationTriangleIcon } from "@patternfly/react-icons";
import type React from "react";
import { useEffect, useState } from "react";
import { parseApiError } from "../parseApiError";

interface RunNewReportModalProps {
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const RunNewReportModal: React.FC<RunNewReportModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsStarting(false);
      setError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isStarting) {
      return;
    }
    setError(null);
    onCancel();
  };

  const handleConfirm = async () => {
    setIsStarting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      console.error("Failed to start new report:", err);
      setError(
        await parseApiError(
          err,
          "Failed to start a new report. Please try again.",
        ),
      );
      setIsStarting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="small"
      aria-labelledby="run-new-report-title"
      aria-describedby="run-new-report-body"
    >
      <ModalHeader
        title={
          <Flex
            alignItems={{ default: "alignItemsCenter" }}
            gap={{ default: "gapSm" }}
          >
            <FlexItem>
              <ExclamationTriangleIcon
                style={{
                  color:
                    "var(--pf-t--global--icon--color--status--warning--default)",
                }}
              />
            </FlexItem>
            <FlexItem>Run a new report</FlexItem>
          </Flex>
        }
        labelId="run-new-report-title"
      />
      <ModalBody id="run-new-report-body">
        {error && (
          <Alert
            variant="danger"
            title="Error"
            isInline
            style={{ marginBottom: "1rem" }}
          >
            {error}
          </Alert>
        )}
        <Content component="p">
          Trigger a fresh vSphere API scan to update your migration report and
          virtual machines list with the latest vCenter data.
        </Content>
        <Content component="p">
          <strong>Keep in mind:</strong>
        </Content>
        <List>
          <ListItem>
            Data collection might take several minutes to complete.
          </ListItem>
          <ListItem>Frequent scans can impact vCenter performance.</ListItem>
          <ListItem>
            Your current report is visible while the scan runs. After the scan
            completes, you can compare the new data against previous reports
            using the comparison tool.
          </ListItem>
        </List>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={() => {
            void handleConfirm();
          }}
          isLoading={isStarting}
          isDisabled={isStarting}
        >
          {error ? "Retry" : "Run new report"}
        </Button>
        <Button variant="link" onClick={handleClose} isDisabled={isStarting}>
          {error ? "Close" : "Cancel"}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

RunNewReportModal.displayName = "RunNewReportModal";
