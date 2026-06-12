import {
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
  Title,
} from "@patternfly/react-core";
import type React from "react";
import { useEffect, useState } from "react";
import { useCredentials } from "./CredentialsContext";

interface EditCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditCredentialsModal: React.FC<EditCredentialsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { status, saveCredentials } = useCredentials();
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(status?.url ?? "");
      setUsername(status?.username ?? "");
      setPassword("");
      setError(null);
    }
  }, [isOpen, status?.url, status?.username]);

  const hasChanges =
    url.trim() !== (status?.url ?? "").trim() ||
    username.trim() !== (status?.username ?? "").trim() ||
    password.trim() !== "";

  const canSave =
    url.trim() !== "" && username.trim() !== "" && hasChanges && !saving;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveCredentials({
        url: url.trim(),
        username: username.trim(),
        password,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save credentials",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="medium"
      aria-labelledby="edit-credentials-title"
    >
      <ModalHeader>
        <Title headingLevel="h2" id="edit-credentials-title">
          Edit credentials
        </Title>
      </ModalHeader>
      <ModalBody>
        {error && (
          <p
            style={{
              color:
                "var(--pf-t--global--text--color--status--danger--default)",
            }}
          >
            {error}
          </p>
        )}
        <Form>
          <FormGroup label="vCenter URL" isRequired fieldId="edit-vcenter-url">
            <TextInput
              id="edit-vcenter-url"
              value={url}
              onChange={(_ev, val) => setUrl(val)}
              placeholder="https://vcenter.example.com"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Include /sdk if your environment requires it.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup label="Username" isRequired fieldId="edit-username">
            <TextInput
              id="edit-username"
              value={username}
              onChange={(_ev, val) => setUsername(val)}
            />
          </FormGroup>
          <FormGroup label="Password" fieldId="edit-password">
            <TextInput
              id="edit-password"
              type="password"
              value={password}
              onChange={(_ev, val) => setPassword(val)}
              placeholder="Leave blank to keep current token"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Enter a new password only to rotate the stored credential
                  token.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSave}
          isLoading={saving}
          isDisabled={!canSave}
        >
          Save
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={saving}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

EditCredentialsModal.displayName = "EditCredentialsModal";
