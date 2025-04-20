![Title](./res/thumbnail.png)

Doing ***\<thing\>*** when ***\<trigger\>*** occurs is quite useful. Listening for ***\<trigger\>*** is *computationally inexpensive* but requires **something to always be on**. Doing ***\<thing\>*** may be *computationally expensive* but only requires **on-demand compute**.

> *Everyone* should have something between a raspberry-pi and a router plugged into their wall at home. This may enable pretty complex background dapps (ex: DCA'ing on AssetHub) which require no signing, since actions taken on your behalf are being run from your local, trusted machine.


### Repository Goals

**(1)** Provide developers with a platform to rapidly develop & easily deploy *lambda* style applications which follow a standardized design pattern & set of tools. One important tool will be the ability to launch remote workers across various cloud providers.

**(2)** Provide users with platform to easily plug-n-play various *"apps"* or *"plugins"* built by developers

**(3)** Be as lightweight as possible

# Setup
run locally with `npx tsx src/index.ts`

### **fly.io**
```
brew install flyctl
```

<br>

This will prompt you to login and requires you to connect your credit card. _I think_ that I've set up the settings s.t. you won't be charged anything.

```bash
# launch
fly apps create election-watch
fly deploy

# shut down
fly apps destroy election-watch
```

<br><br>

# Apps
### Application Design Pattern
Listen for trigger events, which then:
- Perform some extremely lightweight work **OR**
- Spin up a remote worker which does heavier processing


<br><br>

### *Election Watch*
Super light weight app to run as a free fly.io session that watches for phase changes in polkadot election cycles.

Currently this simply sends an email. In the future I would like this to trigger a slightly larger process to download the election snapshot and add it to a huggingface dataset. For right now, I am the slightly larger process (aka manual style).