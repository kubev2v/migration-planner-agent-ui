import { yupResolver } from "@hookform/resolvers/yup";
import type {
  CredentialStatus,
  VcenterCredentials,
} from "@openshift-migration-advisor/agent-sdk";
import { Alert, Form, FormAlert } from "@patternfly/react-core";
import type React from "react";
import { FormProvider, useForm } from "react-hook-form";
import * as yup from "yup";
import TextInputFormGroup from "../common/components/form/TextInputFormGroup";

interface VCenterCredentialsFormProps
  extends Omit<React.ComponentProps<typeof Form>, "onSubmit"> {
  onSubmit: (credentials: VcenterCredentials) => void;
  error?: string;
  initialCredentials?: CredentialStatus | null;
  isEditing?: boolean;
}

function normalizeVcenterUrl(url: string) {
  let vcenterUrl = url.trim().replace(/\/$/, "");
  if (!vcenterUrl.endsWith("/sdk")) {
    vcenterUrl = `${vcenterUrl}/sdk`;
  }
  return vcenterUrl;
}

const schema = yup.object().shape({
  url: yup.string().trim().required("vCenter URL is required"),
  username: yup.string().trim().required("Username is required"),
  password: yup.string().required("Password is required"),
});

export const VCenterCredentialsForm: React.FC<VCenterCredentialsFormProps> = ({
  onSubmit,
  error,
  initialCredentials,
  isEditing = false,
  ...props
}) => {
  const methods = useForm<VcenterCredentials>({
    resolver: yupResolver(schema),
    mode: "onTouched",
    defaultValues: {
      url: initialCredentials?.url || "",
      username: initialCredentials?.username || "",
      password: "",
    },
  });

  const handleFormSubmit = (data: VcenterCredentials) => {
    onSubmit({ ...data, url: normalizeVcenterUrl(data.url) });
  };

  return (
    <FormProvider {...methods}>
      <Form
        noValidate
        id="vcenter-credentials-form"
        onSubmit={(e) => {
          void methods.handleSubmit(handleFormSubmit)(e);
        }}
        {...props}
      >
        {error && (
          <FormAlert>
            <Alert variant="danger" title={error} aria-live="polite" isInline />
          </FormAlert>
        )}

        <TextInputFormGroup
          label="vCenter URL"
          id="vcenter-url"
          name="url"
          type="url"
          isRequired
          isDisabled={isEditing}
          placeholder="https://vcenter-prod-east.lab.example.com"
          helpText="Include /sdk if your environment requires it."
        />

        <TextInputFormGroup
          label="Username"
          id="username"
          name="username"
          isRequired
          placeholder="migration-advisor@prod.example.com"
        />

        <TextInputFormGroup
          label="Password"
          id="password"
          name="password"
          type="password"
          isRequired
        />
      </Form>
    </FormProvider>
  );
};

VCenterCredentialsForm.displayName = "VCenterCredentialsForm";
