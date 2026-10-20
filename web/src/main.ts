import "./style.css";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  type Address,
} from "viem";
import { foundry } from "viem/chains";

const OWNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as Address;
const HOLDER = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Address;

const publicClient = createPublicClient({ chain: foundry, transport: http("/rpc") });

function signer(account: Address) {
  return createWalletClient({ account, chain: foundry, transport: http("/rpc") });
}

const abi = [
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "cap", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "burn",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  { type: "error", name: "OwnableUnauthorizedAccount", inputs: [{ name: "account", type: "address" }] },
  {
    type: "error",
    name: "ERC20ExceededCap",
    inputs: [
      { name: "increasedSupply", type: "uint256" },
      { name: "cap", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "ERC20InsufficientBalance",
    inputs: [
      { name: "sender", type: "address" },
      { name: "balance", type: "uint256" },
      { name: "needed", type: "uint256" },
    ],
  },
] as const;

function coins(value: bigint): string {
  const rounded = (value + 50_000_000_000_000n) / 100_000_000_000_000n;
  const whole = rounded / 10_000n;
  const frac = (rounded % 10_000n).toString().padStart(4, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

function explain(error: unknown): string {
  if (error instanceof BaseError) {
    const reverted = error.walk((item) => item instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name === "OwnableUnauthorizedAccount") return "Rejected. Only the owner can mint.";
      if (name === "ERC20ExceededCap") return "Rejected. That mint would pass the 1,000,000 cap.";
      if (name === "ERC20InsufficientBalance") return "Rejected. The holder does not have enough to burn. Mint some first.";
      return `Rejected (${name ?? "the contract stopped the call"}).`;
    }
    return "The local chain is not running. Start it, then refresh this page.";
  }
  return "The local chain is not running. Start it, then refresh this page.";
}

const status = document.querySelector("#status") as HTMLParagraphElement;
const supplyEl = document.querySelector("#supply") as HTMLParagraphElement;
const capEl = document.querySelector("#cap") as HTMLParagraphElement;
const holderEl = document.querySelector("#holder") as HTMLParagraphElement;
const note = document.querySelector("#note") as HTMLParagraphElement;
const buttons = [...document.querySelectorAll("button")];

let token: Address;

function setNote(text: string, kind: "" | "ok" | "error") {
  note.textContent = text;
  note.className = kind ? `note ${kind}` : "note";
}

async function refresh() {
  const [supply, cap, holder] = await Promise.all([
    publicClient.readContract({ address: token, abi, functionName: "totalSupply" }),
    publicClient.readContract({ address: token, abi, functionName: "cap" }),
    publicClient.readContract({ address: token, abi, functionName: "balanceOf", args: [HOLDER] }),
  ]);
  supplyEl.textContent = coins(supply);
  capEl.textContent = coins(cap);
  holderEl.textContent = coins(holder);
  status.textContent = "Connected to the local chain.";
}

async function submit(account: Address, functionName: "mint" | "burn", args: readonly unknown[]) {
  const request = { address: token, abi, functionName, args, account };
  await publicClient.simulateContract(request as never);
  const hash = await signer(account).writeContract(request as never);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("The transaction was rejected.");
}

async function run(action: () => Promise<string>) {
  buttons.forEach((button) => {
    button.disabled = true;
  });
  setNote("Sending…", "");
  try {
    const message = await action();
    await refresh();
    setNote(message, "ok");
  } catch (error) {
    setNote(explain(error), "error");
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

document.querySelector("#mint")!.addEventListener("click", () =>
  run(async () => {
    await submit(OWNER, "mint", [HOLDER, parseEther("100")]);
    return "The owner minted 100 PTK to the holder.";
  }),
);

document.querySelector("#burn")!.addEventListener("click", () =>
  run(async () => {
    await submit(HOLDER, "burn", [parseEther("40")]);
    return "The holder burned 40 of their own PTK.";
  }),
);

document.querySelector("#stranger")!.addEventListener("click", () =>
  run(async () => {
    await submit(HOLDER, "mint", [HOLDER, parseEther("1")]);
    return "That mint went through. It should have been rejected.";
  }),
);

document.querySelector("#over")!.addEventListener("click", () =>
  run(async () => {
    const cap = await publicClient.readContract({ address: token, abi, functionName: "cap" });
    await submit(OWNER, "mint", [HOLDER, cap + 1n]);
    return "That mint went through. It should have been rejected.";
  }),
);

const loaded = (await fetch("/addresses.json", { cache: "no-store" }).then((response) => response.json())) as { token: Address };
token = loaded.token;

if (token === "0x0000000000000000000000000000000000000000") {
  status.textContent = "The token is not on the local chain yet. Run start-local-pages.ps1 from the portfolio folder.";
} else {
  try {
    await refresh();
  } catch (error) {
    status.textContent = explain(error);
  }
}
