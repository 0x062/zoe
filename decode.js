import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// -------------------------------------------------------
// Configuration
// -------------------------------------------------------
const RPC_URL = process.env.RPC_URL; // e.g., https://rpc-testnet.galileo.0g.ai
const TX_HASH = "0xe8e3d9f1f71d0ab33cb5e52e7984320741c32d9944645e5db6d57ca69d2d6c05";

// ABI including swap function and Transfer event
const ROUTER_ABI = [
  "function swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
  "function getAmountsOut(uint256,address[])",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

async function analyzeTx() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const tx = await provider.getTransaction(TX_HASH);
    if (!tx) throw new Error(`Transaction ${TX_HASH} not found`);

    const receipt = await provider.getTransactionReceipt(TX_HASH);
    if (!receipt) throw new Error(`Receipt for ${TX_HASH} not found`);

    const iface = new ethers.Interface(ROUTER_ABI);

    // Decode input data safely
    const decoded = iface.parseTransaction({ data: tx.data, value: tx.value });
    if (!decoded) {
      console.error("Failed to decode transaction data. Ensure ABI matches the contract.");
      return;
    }

    const [amountIn, amountOutMin, path, toAddress, deadline] = decoded.args;
    console.log("Decoded swap parameters:");
    console.log({
      amountIn: amountIn.toString(),
      amountOutMin: amountOutMin.toString(),
      path,
      toAddress,
      deadline: new Date(deadline.toNumber() * 1000).toLocaleString(),
    });

    // Calculate gas cost
    const gasUsed = receipt.gasUsed;
    const gasPrice = tx.gasPrice;
    const gasCostETH = gasUsed.mul(gasPrice);
    console.log("Gas used:", gasUsed.toString());
    console.log("Gas price (gwei):", ethers.formatUnits(gasPrice, "gwei"));
    console.log("Total gas cost (ETH):", ethers.formatEther(gasCostETH));

    // Fetch block timestamp
    const block = await provider.getBlock(receipt.blockNumber);
    console.log(
      `Transaction confirmed in block ${receipt.blockNumber} at ${new Date(
        block.timestamp * 1000
      ).toLocaleString()}`
    );

    // Parse Transfer events from logs
    console.log("Transfer events:");
    receipt.logs.forEach((log) => {
      try {
        const parsedLog = iface.parseLog(log);
        if (parsedLog && parsedLog.name === "Transfer") {
          const { from, to, value } = parsedLog.args;
          console.log(
            `- from: ${from}, to: ${to}, value: ${value.toString()}`
          );
        }
      } catch (_) {
        // ignore logs that don't match
      }
    });
  } catch (error) {
    console.error("Error analyzing transaction:", error);
  }
}

analyzeTx();
