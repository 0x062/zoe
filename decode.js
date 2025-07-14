import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// -------------------------------------------------------
// Configuration
// -------------------------------------------------------
const RPC_URL = process.env.RPC_URL; // e.g., https://rpc-testnet.galileo.0g.ai
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Wallet private key
// Universal Router contract address on Galileo testnet
const UNIVERSAL_ROUTER_ADDRESS = process.env.UNIVERSAL_ROUTER_ADDRESS;

// Swap settings
type SwapConfig = {
  tokenIn: string;      // Address of token to swap from
  tokenOut: string;     // Address of token to swap to
  amountIn: string;     // Human-readable, e.g., "1.0"
  slippage: number;     // e.g., 0.005 for 0.5%
  deadlineOffset: number; // Seconds from now
};

const swapConfig: SwapConfig = {
  tokenIn: process.env.TOKEN_IN_ADDRESS,
  tokenOut: process.env.TOKEN_OUT_ADDRESS,
  amountIn: process.env.SWAP_AMOUNT || "1.0",
  slippage: parseFloat(process.env.SLIPPAGE || "0.005"),
  deadlineOffset: parseInt(process.env.DEADLINE_OFFSET || "600"),
};

// Universal Router ABI
const UNIVERSAL_ROUTER_ABI = [
  "function execute(bytes commands, bytes[] inputs, uint256 deadline) payable returns (bytes[] memory)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const router = new ethers.Contract(UNIVERSAL_ROUTER_ADDRESS, UNIVERSAL_ROUTER_ABI, wallet);

  // Prepare amounts
  const amountIn = ethers.parseUnits(swapConfig.amountIn, 18);

  // Fetch amountsOut via router.getAmountsOut style? Universal Router doesn't expose directly
  // Instead use a standard pair router ABI (e.g., UniswapV2) or a quoter contract
  const quoterAbi = ["function getAmountsOut(uint256,address[]) view returns (uint256[])"];
  const quoter = new ethers.Contract(swapConfig.routerPairAddress, quoterAbi, provider);
  const path = [swapConfig.tokenIn, swapConfig.tokenOut];
  const amountsOut = await quoter.getAmountsOut(amountIn, path);
  const amountOutMin = amountsOut[1]
    .mul(ethers.parseUnits((1 - swapConfig.slippage).toString(), 18))
    .div(ethers.parseUnits("1.0", 18));

  // Deadline
  const deadline = Math.floor(Date.now() / 1000) + swapConfig.deadlineOffset;

  // Build commands and inputs
  // 0x10 = swapExactTokensForTokens
  const commands = "0x10";
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  const inputs = [
    abiCoder.encode(["uint256"], [amountIn]),
    abiCoder.encode(["uint256"], [amountOutMin]),
    abiCoder.encode(["address[]"], [path]),
    abiCoder.encode(["address"], [wallet.address]),
    abiCoder.encode(["uint256"], [deadline])
  ];

  console.log("Executing swap via Universal Router...");
  const tx = await router.execute(commands, inputs, deadline, {
    // no ETH value since ERC20->ERC20
    gasLimit: 500_000
  });

  console.log(`Swap tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Swap confirmed in block ${receipt.blockNumber}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
