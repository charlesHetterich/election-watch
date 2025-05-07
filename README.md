![Title](./res/thumbnail.png)

Doing ***\<thing\>*** when ***\<trigger\>*** occurs is quite useful. Listening for ***\<trigger\>*** is *computationally inexpensive* but requires **something to always be on**. Doing ***\<thing\>*** may be *computationally expensive* but only requires **on-demand availability**.

#### *Substrate Lambdas aims to provide a* **self hosted FaaS** *(function-as-a-service) platform.*

### Repository Goals

**(1)** Provide developers with a platform to rapidly develop & easily deploy *lambda* style applications which follow a standardized design pattern & set of tools. One important tool will be the ability to launch remote workers across various cloud providers.

**(2)** Provide users with platform to easily plug-n-play various *"apps"* or *"plugins"* built by developers

**(3)** Be as lightweight as possible

**(4)** Be as readable as possible for a layperson (specifically *app* code, but also *core* code where possible). *Code is truth— no process is trustless unless you personally can read the code.*

# Features
### Workers
A core feature of Substrate Lambdas is the ability for apps to launch remote jobs in response to on-chain events. We provide a simple unified interface for app developers to launch jobs across a variety of cloud providers & server types.

| Platform                                  | Type      | Provider     | Payment Method |Development Status|
|-|-|-|-|-|
| [Vast.ai](https://vast.ai/)               | GPU       | Open marketplace |Credit Card ☹️ |⚠️ Experimental
| [OctaSpace](https://octa.space/)          | GPU       | Open marketplace |Ethereum 🤠 *(In talks for native Polkadot ecosystem support 🥰)* | 🔄 To-do
| [Libcloud](https://libcloud.apache.org/)  | CPU/GPU   | Supports [more than 50](https://libcloud.readthedocs.io/en/stable/supported_providers.html) mainstream cloud providers |Credit Card ☹️ | 🔄 To-do
| *Self | CPU/GPU       | Self-hosted |**--** |🔄 To-do

### App Registry
Substrate Lambdas will provide an app registry for developers to publish their apps to. The first iteration of the registry will simply be a [HuggingFace](https://huggingface.co/) repository with a folder for each app. Developers will upload their apps using the `dothome` CLI. This will allow developers to easily publish/modify their own applications while restricting access to modify unpermissioned sections of the repository hosting the registry.

Why HuggingFace? Well— it's git configured for handling big data... and gives you *A LOT* of free storage 🤫. Great for dumping artifacts.

### CLI: `dothome`
###### *Note: this command table is in the "idea simmering" stage. Largely just an aggregation of living notes that will converge to a more sensible/stable idea in the coming months*

| Command       | Sub-command   | Input         | Description       |
|---------------|---------------|---------------|-------------------|
| **`app`**     | `list`        |               | List all apps     |
|               | `status`      | \<app-name>   | Show app status   |
| **`logs`**    |               | \<app-name>   | View logs         |
| **`worker`**  | `list`        |               | List workers      |
|               | `connect`     |               | Connect to worker |
|               | `kill`        |               | Terminate worker  |
| **`overview`**| `apps`        |               | Overview of apps  |
| **`system`**  | `account`     |               | System apps info  |
|               | `users`       |               | System apps info  |
|               | `health`      |               | System apps info  |

# Quick Start
All apps in `src/apps` will be run. Any apps that you would like to disable, rename the folder with a prefix of `_`. If you would like to run a custom app, create a new app folder & follow the specification defined in the [Apps](#apps) section.

Depending on the applications running you will have to define a `.env` file in the root directory. 
```bash
# election-watch
EMAIL=<your-gmail>
PASSWORD=<your-gmail-appkey>

# polkadot-election-dataset-aggregator
HF_TOKEN=<your-huggingface-token>
REPO_NAME=<your-huggingface-repo>
```

### Local
Just run `npm install` and then `npm start`.

### Fly.io
We include a `Dockerfile` & `fly.toml` for easy deployment to [fly.io](https://fly.io/). First install the CLI tool:
```
brew install flyctl
```

The first time you run this, you will be prompted to login and connect your credit card. _I think_ that I've set up the settings s.t. you won't be charged anything.

```bash
# launch
fly apps create substrate-lambdas
fly deploy
fly scale count 1 -y # scale downn to single node

# shut down
fly apps destroy substrate-lambdas -y
```

# Apps
Applications are expected to be defined in `src/apps/<app-name>/index.ts` with the following four variables defined:
```ts
import { dot } from "@polkadot-api/descriptors";
import { Context, Payload, Observables } from "@lambdas/app-support";

export const watching = Observables.event.Something.ImWatching;
export const description = "Description of how this app works & what it does";

export function trigger(
    content: Payload<typeof watching>,
    context: Context<typeof dot>
): boolean {
    // custom filtering . . .
}

export function lambda(
    content: Payload<typeof watching>,
    context: Context<typeof dot>
) {
    // do something upon triggering . . .
}
```

## Hardware Campaign & Long-Term Vision
> *Everyone & their mother* should have something between a raspberry-pi and a router plugged into their wall at home (i.e. a light-weight device that is always on, connected to the internet, & privately accessible). Hardware-wise, think of something like an Amazon Alexa. I feel like this product should be pretty feasible.
>
>My hope is this may enable seemingly complex background dapps to exist in a self-hosted manner
> - DCA'ing on AssetHub 
> - Pay for & launch external GPU-server workloads
> - Some chain-reaction of events triggering other events
> - Extensive & highly customizable notification services
> - Self-hosted general tax data aggregator
>
>which require no signing, since actions taken on your behalf are being run from your local, trusted machine. Many pseudo-backends can be built into this at-home lambda layer, and front ends can tweak settings with secure direct connection.
...

<br><br><br>


###### ***built on [papi](https://papi.how/)***