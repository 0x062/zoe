import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// -------------------------------------------------------
// Configuration
// -------------------------------------------------------
const RPC_URL = process.env.RPC_URL;                    // RPC endpoint
const TX_HASH = "0xe8e3d9f1f71d0ab33cb5e52e7984320741c32d9944645e5db6d57ca69d2d6c05"; // Transaction hash to analyze

// ABI for Universal Router execute function
const UNIVERSAL_ROUTER_ABI = [
  "function execute(bytes commands, bytes[] inputs, uint256 deadline)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Fetch raw transaction
  const tx = await provider.getTransaction(TX_HASH);
  if (!tx) throw new Error(`Transaction ${TX_HASH} not found`);
  console.log("Raw input data:\n", tx.data);

  // Decode execute call
  const iface = new ethers.Interface(UNIVERSAL_ROUTER_ABI);
  const decoded = iface.parseTransaction({ data: tx.data, value: tx.value });
  const [commands, inputs, deadline] = decoded.args;

  console.log(`\nMethod: ${decoded.name}`);
  console.log("Commands (hex):", commands);
  console.log("Deadline (unix):", deadline.toString());
  console.log("Deadline (readable):", new Date(deadline.toNumber() * 1000).toLocaleString());

  // Decode each input element
  const coder = ethers.AbiCoder.defaultAbiCoder();
  console.log("\nInputs:");
  inputs.forEach((inputBytes, idx) => {
    console.log(`\n-- Input[${idx}] raw:`, inputBytes);
    try {
      const [asUint] = coder.decode(["uint256"], inputBytes);
      console.log(`   as uint256: ${asUint.toString()}`);
      return;
    } catch {}
    try {
      const [asAddrArr] = coder.decode(["address[]"], inputBytes);
      console.log("   as address[]:", asAddrArr);
      return;
    } catch {}
    try {
      const [asAddr] = coder.decode(["address"], inputBytes);
      console.log("   as address:", asAddr);
      return;
    } catch {}
    console.log("   [undecoded raw data]");
  });

  // Transaction receipt details
  const receipt = await provider.getTransactionReceipt(TX_HASH);
  console.log("\nReceipt Details:", {
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    status: receipt.status
  });
}

main().catch(console.error);
