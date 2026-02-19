
# VirtualMachine


## Properties

Name | Type
------------ | -------------
`name` | string
`id` | string
`vCenterState` | string
`cluster` | string
`datacenter` | string
`diskSize` | number
`memory` | number
`issueCount` | number
`migratable` | boolean
`template` | boolean
`inspection` | [VmInspectionStatus](VmInspectionStatus.md)

## Example

```typescript
import type { VirtualMachine } from '@migration-planner-ui/agent-client'

// TODO: Update the object below with actual values
const example = {
  "name": null,
  "id": null,
  "vCenterState": null,
  "cluster": null,
  "datacenter": null,
  "diskSize": null,
  "memory": null,
  "issueCount": null,
  "migratable": null,
  "template": null,
  "inspection": null,
} satisfies VirtualMachine

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as VirtualMachine
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


