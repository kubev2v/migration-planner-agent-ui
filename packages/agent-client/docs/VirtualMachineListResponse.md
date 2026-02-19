
# VirtualMachineListResponse


## Properties

Name | Type
------------ | -------------
`vms` | [Array&lt;VirtualMachine&gt;](VirtualMachine.md)
`total` | number
`page` | number
`pageCount` | number

## Example

```typescript
import type { VirtualMachineListResponse } from '@migration-planner-ui/agent-client'

// TODO: Update the object below with actual values
const example = {
  "vms": null,
  "total": null,
  "page": null,
  "pageCount": null,
} satisfies VirtualMachineListResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as VirtualMachineListResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


