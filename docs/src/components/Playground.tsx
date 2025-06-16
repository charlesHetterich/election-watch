import { Sandpack } from "@codesandbox/sandpack-react";

const example = `\
import { App, Observables } from "@lambdas/app-support";
export default App(\`This is a dummy application!\`, {
  watching: Observables.event.polkadot.Balances.Transfer(),
  trigger(transfer, c) { console.log("I'm here!"); return true; },
  lambda(transfer, c)  { console.log("Now I'm here!", transfer); },
});
`;

export default () => (
  <Sandpack
    template="react-ts"
    files={{ "/App.tsx": example }}
    options={{ editorHeight: "100%", showNavigator: false }}
    customSetup={{
      dependencies: { "@lambdas/app-support": "workspace:*" },
      entry: "/App.tsx",
    }}
  />
);
