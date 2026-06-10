import {
  Alert,
  Checkbox,
  Content,
  Form,
  FormGroup,
  Stack,
  StackItem,
  TextInput,
} from "@patternfly/react-core";
import { ExternalLinkAltIcon } from "@patternfly/react-icons";
import type React from "react";
import type { ForecasterCredentials } from "../forecasterTypes";

export interface CredentialsFormProps {
  credentials: ForecasterCredentials;
  onChange: (c: ForecasterCredentials) => void;
  error: string | null;
  missingPrivileges: string[];
  isLoading: boolean;
  acknowledged: boolean;
  onAcknowledgedChange: (checked: boolean) => void;
}

export const CredentialsForm: React.FC<CredentialsFormProps> = ({
  credentials,
  onChange,
  error,
  missingPrivileges,
  isLoading,
  acknowledged,
  onAcknowledgedChange,
}) => (
  <Stack hasGutter>
    <StackItem>
      <Content component="p">
        Enter your vCenter credentials. These are required to discover available
        datastores and run the benchmark.
      </Content>
    </StackItem>
    {error && (
      <StackItem>
        <Alert variant="danger" title="Error" isInline>
          {error}
          {missingPrivileges.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <strong>Missing privileges:</strong>
              <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                {missingPrivileges.map((p) => (
                  <li key={p}>
                    <code>{p}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Alert>
      </StackItem>
    )}
    <StackItem>
      <Form>
        <FormGroup label="vCenter URL" isRequired fieldId="vcenter-url">
          <TextInput
            id="vcenter-url"
            value={credentials.url}
            onChange={(_e, v) => onChange({ ...credentials, url: v })}
            placeholder="https://vcenter.example.com"
            isDisabled={isLoading}
          />
          <Content
            component="small"
            style={{ color: "var(--pf-t--global--text--color--200)" }}
          >
            Example: https://vcenter.example.com
          </Content>
        </FormGroup>
        <FormGroup label="Username" isRequired fieldId="vcenter-username">
          <TextInput
            id="vcenter-username"
            value={credentials.username}
            onChange={(_e, v) => onChange({ ...credentials, username: v })}
            placeholder="administrator@vsphere.local"
            isDisabled={isLoading}
          />
          <Content
            component="small"
            style={{ color: "var(--pf-t--global--text--color--200)" }}
          >
            Example: administrator@vsphere.local
          </Content>
        </FormGroup>
        <FormGroup label="Password" isRequired fieldId="vcenter-password">
          <TextInput
            id="vcenter-password"
            type="password"
            value={credentials.password}
            onChange={(_e, v) => onChange({ ...credentials, password: v })}
            isDisabled={isLoading}
          />
        </FormGroup>
      </Form>
    </StackItem>
    <StackItem>
      <Alert
        variant="warning"
        isInline
        title="The forecaster creates temporary virtual machines and virtual disks in your vCenter environment"
      >
        <Content component="p" style={{ marginBottom: "12px" }}>
          While all resources are cleaned up automatically after benchmarking,
          vCenter administrators should be aware of this activity.
        </Content>
        <Checkbox
          id="cred-acknowledge-temp-resources"
          label="I understand temporary resources will be created in my vCenter environment."
          isChecked={acknowledged}
          onChange={(_e, checked) => onAcknowledgedChange(checked)}
        />
        <div style={{ marginTop: "8px" }}>
          <a
            href="https://docs.redhat.com/en/documentation/migration_toolkit_for_virtualization/2.10/html-single/planning_your_migration_to_red_hat_openshift_virtualization/index#about-storage-copy-offload_vmware"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more <ExternalLinkAltIcon />
          </a>
        </div>
      </Alert>
    </StackItem>
  </Stack>
);

CredentialsForm.displayName = "CredentialsForm";
