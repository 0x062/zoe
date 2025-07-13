import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const RPC_URL   = process.env.RPC_URL;
const TX_HASH   = "0xe8e3d9f1f71d0ab33cb5e52e7984320741c32d9944645e5db6d57ca69d2d6c05";
const ROUTER_ABI = [
  "function swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

async function analyzeTx() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const tx       = await provider.getTransaction(TX_HASH);
  const receipt  = await provider.getTransactionReceipt(TX_HASH);
  const iface    = new ethers.Interface(ROUTER_ABI);

  // Decode input
  const decoded = iface.parseTransaction({ data: tx.data, value: tx.value });
  console.log("Decoded swap params:", {
    amountIn: decoded.args[0].toString(),
    amountOutMin: decoded.args[1].toString(),
    path: decoded.args[2],
    to: decoded.args[3],
    deadline: new Date(decoded.args[4].toNumber() * 1000).toLocaleString(),
  });

  // Gas cost
  const gasCost = receipt.gasUsed.mul(tx.gasPrice);
  console.log("Gas used:", receipt.gasUsed.toString());
  console.log("Gas price (gwei):", ethers.formatUnits(tx.gasPrice, "gwei"));
  console.log("Total gas cost (ETH):", ethers.formatEther(gasCost));

  // Block timestamp
  const block = await provider.getBlock(receipt.blockNumber);
  console.log("Block:", receipt.blockNumber, "at", new Date(block.timestamp * 1000).toLocaleString());

  // Parse Transfer events to get actual token flows
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed.name === "Transfer") {
        console.log(`Transfer Event: from ${parsed.args.from} to ${parsed.args.to}, value ${parsed.args.value.toString()}`);
      }
    } catch {}
  }
}

analyzeTx().catch(console.error);
