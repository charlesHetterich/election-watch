*Temporary sub-project to reporoduce inconsistent behevior listening for chopsticks events over websocket with PAPI*

### Steps to reproduce
1. `bash setup.sh`
3. Observe that our `.forEach` and `.subscribe` listeners *do* work when listening to the actual polkadot relay chain over websocket:
```bash
npm start -- actual
# Wait a few seconds for a transfer event to come through
```
2. Start chopsticks mock chain in a separate terminal:
```bash
# kill any other chopsticks processes
pgrep -f \"@acala-network/chopsticks\" | xargs kill

# start mock polkadot relay chain
npx @acala-network/chopsticks -c ./polkadot.yml
```
4. Observe that our `.forEach` and `.subscribe` listeners **dont** work when listening to a chopsticks mock of the polkadot relay chain over websocket:
```bash
# NOTE: expects chopsticks mock to be running on port 8000
npm start -- mock
```