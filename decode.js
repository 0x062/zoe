import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// -------------------------------------------------------
// Configuration
// -------------------------------------------------------
const RPC_URL = process.env.RPC_URL;
const TX_HASH = "0xe8e3d9f1f71d0ab33cb5e52e7984320741c32d9944645e5db6d57ca69d2d6c05";

// Extended ABI including common swap functions and Transfer event
const ROUTER_ABI = [
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)",
  "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)",
  "function getAmountsOut(uint256 amountIn, address[] calldata path)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

async function analyzeTx() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const tx = await provider.getTransaction(TX_HASH);
    if (!tx) throw new Error(`Transaction ${TX_HASH} not found`);

    // Log raw input data and method ID
    console.log("Raw input data:", tx.data);
    const methodId = tx.data.slice(0, 10);
    console.log("Method ID:", methodId);

    const receipt = await provider.getTransactionReceipt(TX_HASH);
    if (!receipt) throw new Error(`Receipt for ${TX_HASH} not found`);

    const iface = new ethers.Interface(ROUTER_ABI);

    // Attempt to decode
    let decoded;
    try {
      decoded = iface.parseTransaction({ data: tx.data, value: tx.value });
    } catch (e) {
      console.error("Decoding failed with ABI methods. ABI may not match. See raw data above.");
      return;
    }

    const [amountIn, amountOutMin, path, toAddress, deadline] = decoded.args;
    console.log("Decoded swap parameters:", {
      method: decoded.name,
      amountIn: amountIn.toString(),
      amountOutMin: amountOutMin.toString(),
      path,
      toAddress,
      deadline: new Date(deadline.toNumber() * 1000).toLocaleString(),
    });

    // Gas and events as before...
    const gasUsed = receipt.gasUsed;
    const gasPrice = tx.gasPrice;
    const gasCostETH = gasUsed.mul(gasPrice);
    console.log("Gas used:", gasUsed.toString());
    console.log("Gas price (gwei):", ethers.formatUnits(gasPrice, "gwei"));
    console.log("Total gas cost (ETH):", ethers.formatEther(gasCostETH));

    const block = await provider.getBlock(receipt.blockNumber);
    console.log(`Confirmed in block ${receipt.blockNumber} at ${new Date(block.timestamp * 1000).toLocaleString()}`);

    console.log("Transfer events:");
    receipt.logs.forEach(log => {
      try {
        const parsedLog = iface.parseLog(log);
        if (parsedLog.name === "Transfer") {
          console.log(`- from ${parsedLog.args.from} to ${parsedLog.args.to}: value ${parsedLog.args.value.toString()}`);
        }
      } catch {};
    });
  } catch (error) {
    console.error("Error analyzing transaction:", error);
  }
}

analyzeTx();
