
# VirtualMachineDetail


## Properties

Name | Type
------------ | -------------
`id` | string
`name` | string
`uuid` | string
`firmware` | string
`powerState` | string
`connectionState` | string
`host` | string
`datacenter` | string
`cluster` | string
`folder` | string
`cpuCount` | number
`coresPerSocket` | number
`cpuAffinity` | Array&lt;number&gt;
`memoryMB` | number
`guestName` | string
`guestId` | string
`hostName` | string
`ipAddress` | string
`storageUsed` | number
`template` | boolean
`migratable` | boolean
`faultToleranceEnabled` | boolean
`nestedHVEnabled` | boolean
`toolsStatus` | string
`toolsRunningStatus` | string
`disks` | [Array&lt;VMDisk&gt;](VMDisk.md)
`nics` | [Array&lt;VMNIC&gt;](VMNIC.md)
`devices` | [Array&lt;VMDevice&gt;](VMDevice.md)
`guestNetworks` | [Array&lt;GuestNetwork&gt;](GuestNetwork.md)
`issues` | Array&lt;string&gt;
`inspection` | [VmInspectionStatus](VmInspectionStatus.md)

## Example

```typescript
import type { VirtualMachineDetail } from '@migration-planner-ui/agent-client'

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "name": null,
  "uuid": null,
  "firmware": null,
  "powerState": null,
  "connectionState": null,
  "host": null,
  "datacenter": null,
  "cluster": null,
  "folder": null,
  "cpuCount": null,
  "coresPerSocket": null,
  "cpuAffinity": null,
  "memoryMB": null,
  "guestName": null,
  "guestId": null,
  "hostName": null,
  "ipAddress": null,
  "storageUsed": null,
  "template": null,
  "migratable": null,
  "faultToleranceEnabled": null,
  "nestedHVEnabled": null,
  "toolsStatus": null,
  "toolsRunningStatus": null,
  "disks": null,
  "nics": null,
  "devices": null,
  "guestNetworks": null,
  "issues": null,
  "inspection": null,
} satisfies VirtualMachineDetail

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as VirtualMachineDetail
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


