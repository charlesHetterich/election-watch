# Polkadot Election Watch

Super light weight app to run as a free fly.io session that watches for phase changes in polkadot election cycles.

Currently this simply sends an email. In the future I would like this to trigger a slightly larger process to download the election snapshot and add it to a huggingface dataset. For right now, I am the slightly larger process (aka manual style).

In the future this will also spin up & shut down a server to calculate & submit my solutions.

*An interesting slightly more ambitious idea in the future could be to to use this concept to build a general 'lambda' type SaaS that triggers lambda functions on any polkadot event*