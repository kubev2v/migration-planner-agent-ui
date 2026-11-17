import { Label, LabelGroup, Title } from "@patternfly/react-core";
import type React from "react";
import {
  getVmVSphereAnnotation,
  getVmVSphereTags,
  type VirtualMachineDetailWithVSphere,
} from "../../virtualMachineParsing";

interface VMVSphereMetadataSectionProps {
  vm: VirtualMachineDetailWithVSphere;
}

export const VMVSphereMetadataSection: React.FC<
  VMVSphereMetadataSectionProps
> = ({ vm }) => {
  const vsphereTags = getVmVSphereTags(vm);
  const annotation = getVmVSphereAnnotation(vm);

  return (
    <>
      <Title headingLevel="h3" size="md" style={{ marginTop: "1.5rem" }}>
        vSphere tags
      </Title>
      {vsphereTags.length > 0 ? (
        <LabelGroup numLabels={5} style={{ marginTop: "0.5rem" }}>
          {vsphereTags.map((tag) => (
            <Label key={tag} isCompact>
              {tag}
            </Label>
          ))}
        </LabelGroup>
      ) : (
        <div style={{ marginTop: "0.5rem" }}>–</div>
      )}

      <Title headingLevel="h3" size="md" style={{ marginTop: "1.5rem" }}>
        vSphere annotation
      </Title>
      {annotation ? (
        <p
          style={{
            marginTop: "0.5rem",
            marginBottom: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {annotation}
        </p>
      ) : (
        <div style={{ marginTop: "0.5rem" }}>–</div>
      )}
    </>
  );
};
