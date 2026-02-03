
# SearchEventsRequest


## Properties

Name | Type
------------ | -------------
`args` | [Array&lt;SearchMarketsRequestArgsInner&gt;](SearchMarketsRequestArgsInner.md)
`credentials` | [ExchangeCredentials](ExchangeCredentials.md)

## Example

```typescript
import type { SearchEventsRequest } from 'pmxtjs'

// TODO: Update the object below with actual values
const example = {
  "args": ["Fed Chair",{"limit":5}],
  "credentials": null,
} satisfies SearchEventsRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SearchEventsRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


