# 02 — Capped token

An ERC-20 with a supply cap, owner-only mint, and burn. Foundry tests cover the rules. A script deploys it to Base Sepolia.

## Why this one

Token contracts are the first screen on smart-contract job posts. The useful part is not the token itself. It is tests, access control, and a deployment you can link.

The token is reused by the staking vault and the mini AMM, so later projects are not toy contracts with no connection.

## You will be able to show

`forge test` passing, and a BaseScan link for the deployed contract.

## Stack

Solidity, Foundry, OpenZeppelin, Base Sepolia.

## Page

http://localhost:5174

From the portfolio folder, run `.\start-local-pages.ps1`. Then use the buttons: the owner mints 100, the holder burns 40, a mint from the holder is rejected, and a mint past 1,000,000 is rejected.

## Run

Foundry lives in `%USERPROFILE%\.foundry\bin`. Open a new terminal, then from this folder:

```bash
forge test
```

Nine tests cover the name, the cap, owner minting, a rejected mint from someone else, and burn.

To watch the same rules on a local chain, start Anvil in one terminal:

```bash
anvil
```

In another terminal, deploy with Anvil's unlocked account. That address is a public local test account. It is not a wallet for real funds.

```bash
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --unlocked --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

A Base Sepolia deploy uses the same script. Put a testnet-only key in `.env` as `PRIVATE_KEY=0x...`, fund that address with Base Sepolia ETH, then:

```bash
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast
```

`.env` is ignored by git. Do not put a key that holds real funds in it.

## Done when

- Minting above the cap fails.
- A non-owner cannot mint.
- Holders can burn their own tokens.
- The deployed address is written down in this folder after launch.
