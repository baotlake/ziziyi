# Invoker

## Chrome extension messages

```ts
const invoker = new ExtMsgInvoker("app", {
  perferReceiptResponse: true,
  // Optional: collect notification execution and response delivery failures.
  onError: (error) => recordDiagnostic(error),
});

invoker.add("getTab", () => getCurrentTab());
invoker.listen();

try {
  const tab = await invoker.invoke({ func: "getTab", timeout: 5000 });
} catch (error) {
  showExtensionError(error);
}

// No business response is expected, but delivery can still fail.
void invoker
  .invoke({ func: "contentMounted", reply: false })
  .catch((error) => recordDiagnostic(error));
```

The Chrome adapter keeps the native response channel open only for a request
that expects a receipt and matches a registered local service. Notifications,
response messages, unrelated messages, and requests for other contexts do not
keep the channel open.

`waitInvoke()` observes a matching call without claiming its response. Unknown
services are ignored because extension messages can reach several contexts.

`IGNORE` retains its existing meaning: this service sends no response, allowing
another service to answer. An empty `sendResponse()` is still a response and must
not be used as a cleanup operation. In receipt mode, if all handlers return
`IGNORE`, the caller may receive a channel-closed failure. A sole handler that
owns a request should return a result or throw an error. Decide routing before
starting async service work whenever possible.

`invoke()` continues to propagate transport and business failures, including for
`reply: false`. Callers must handle its rejected promise. The optional `onError`
callback receives notification execution and detached response delivery failures;
it does not replace error handling on the sender. The Chrome adapter does not
print these failures directly to the host website's console.

When a background script has its own router, delegate RPC messages to the same
handler used by `listen()`. Do not add an unconditional `return true`:

```ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message?.type) {
    case "invoke-request":
    case "invoke-response":
      return invoker.handleMessage(message, sender, sendResponse);
    // Handle other application messages with their own response semantics.
  }
});
```

Register either this router or `listen()` for each request, so services execute
once. Repeated `listen()` calls on the same instance replace the old listener.

The base invoker preserves service rejection values. At the Chrome JSON boundary,
`Error` instances are represented by their name, message, and enumerable custom
fields; already structured errors keep their data. Other transports retain their
existing rejection values without this conversion.

Timeout and cancellation behavior is unchanged: they apply while waiting for the
business response after `send()` completes, and do not cancel remote service work.
