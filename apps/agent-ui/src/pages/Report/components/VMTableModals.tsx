import {
  Button,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@patternfly/react-core";
import type React from "react";
import type { VMTableLogic } from "./vmTableTypes";

export interface VMTableModalsProps {
  logic: VMTableLogic;
  onCancelInspection?: (vmId: string) => void;
  onExcludeFromReports?: (vmIds: string[]) => Promise<void>;
  onIncludeInReports?: (vmIds: string[]) => Promise<void>;
  onSelectionChange?: (selected: Set<string>) => void;
}

export const VMTableModals: React.FC<VMTableModalsProps> = ({
  logic,
  onCancelInspection,
  onExcludeFromReports,
  onIncludeInReports,
  onSelectionChange,
}) => {
  const {
    cancelInspectionVmId,
    closeCancelInspectionConfirm,
    isExcludeModalOpen,
    setIsExcludeModalOpen,
    isExcludeLoading,
    setIsExcludeLoading,
    isIncludeModalOpen,
    setIsIncludeModalOpen,
    isIncludeLoading,
    setIsIncludeLoading,
    vmById,
    selectedExcludedIds,
    selectedIncludedIds,
  } = logic;

  return (
    <>
      <Modal
        isOpen={cancelInspectionVmId !== null}
        onClose={closeCancelInspectionConfirm}
        aria-labelledby="cancel-inspection-title"
        aria-describedby="cancel-inspection-body"
        variant="small"
      >
        <ModalHeader
          title="Cancel deep inspection"
          titleIconVariant="warning"
          labelId="cancel-inspection-title"
        />
        <ModalBody id="cancel-inspection-body">
          <Content component="p">
            {(() => {
              const vmName = cancelInspectionVmId
                ? vmById.get(cancelInspectionVmId)?.name
                : undefined;
              if (vmName) {
                return (
                  <>
                    Are you sure you want to cancel deep inspection for{" "}
                    <strong>{vmName}</strong>?
                  </>
                );
              }
              return <>Are you sure you want to proceed?</>;
            })()}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            onClick={() => {
              if (cancelInspectionVmId) {
                onCancelInspection?.(cancelInspectionVmId);
              }
              closeCancelInspectionConfirm();
            }}
          >
            Confirm
          </Button>
          <Button variant="link" onClick={closeCancelInspectionConfirm}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {/* Exclude from reports confirmation modal */}
      {onExcludeFromReports && (
        <Modal
          isOpen={isExcludeModalOpen}
          onClose={() => setIsExcludeModalOpen(false)}
          aria-labelledby="exclude-reports-title"
          aria-describedby="exclude-reports-body"
          variant="small"
        >
          <ModalHeader
            title="Exclude from reports?"
            labelId="exclude-reports-title"
          />
          <ModalBody id="exclude-reports-body">
            <Content component="p">
              {(() => {
                const names = selectedIncludedIds
                  .map((id) => vmById.get(id)?.name)
                  .filter((name): name is string => Boolean(name));

                if (names.length === 1) {
                  return (
                    <>
                      <strong>{names[0]}</strong> will be excluded from all
                      assessment reports. You can include it again from the
                      Actions menu.
                    </>
                  );
                }

                return (
                  <>
                    <strong>{names.length} VMs</strong> will be excluded from
                    all assessment reports. You can include them again from the
                    Actions menu.
                  </>
                );
              })()}
            </Content>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              isLoading={isExcludeLoading}
              isDisabled={isExcludeLoading}
              onClick={async () => {
                setIsExcludeLoading(true);
                try {
                  await onExcludeFromReports(selectedIncludedIds);
                  setIsExcludeModalOpen(false);
                  onSelectionChange?.(new Set());
                } catch (err) {
                  console.error("Error excluding VMs from reports:", err);
                } finally {
                  setIsExcludeLoading(false);
                }
              }}
            >
              Exclude from reports
            </Button>
            <Button
              variant="link"
              isDisabled={isExcludeLoading}
              onClick={() => setIsExcludeModalOpen(false)}
            >
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Include in reports confirmation modal */}
      {onIncludeInReports && (
        <Modal
          isOpen={isIncludeModalOpen}
          onClose={() => setIsIncludeModalOpen(false)}
          aria-labelledby="include-reports-title"
          aria-describedby="include-reports-body"
          variant="small"
        >
          <ModalHeader
            title="Include in reports?"
            labelId="include-reports-title"
          />
          <ModalBody id="include-reports-body">
            <Content component="p">
              {(() => {
                const names = selectedExcludedIds
                  .map((id) => vmById.get(id)?.name)
                  .filter((name): name is string => Boolean(name));

                if (names.length === 1) {
                  return (
                    <>
                      <strong>{names[0]}</strong> will be included in all
                      assessment reports again.
                    </>
                  );
                }

                return (
                  <>
                    <strong>{names.length} VMs</strong> will be included in all
                    assessment reports again.
                  </>
                );
              })()}
            </Content>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              isLoading={isIncludeLoading}
              isDisabled={isIncludeLoading}
              onClick={async () => {
                setIsIncludeLoading(true);
                try {
                  await onIncludeInReports(selectedExcludedIds);
                  setIsIncludeModalOpen(false);
                  onSelectionChange?.(new Set());
                } catch (err) {
                  console.error("Error including VMs in reports:", err);
                } finally {
                  setIsIncludeLoading(false);
                }
              }}
            >
              Include in reports
            </Button>
            <Button
              variant="link"
              isDisabled={isIncludeLoading}
              onClick={() => setIsIncludeModalOpen(false)}
            >
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};

VMTableModals.displayName = "VMTableModals";
