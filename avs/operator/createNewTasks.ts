import { ethers } from "ethers";
import * as dotenv from "dotenv";
const fs = require("fs");
const path = require("path");
dotenv.config();

// Setup env variables
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
/// TODO: Hack
let chainId = 31337;

const avsDeploymentData = JSON.parse(
  fs.readFileSync(
    path.resolve(
      __dirname,
      `../contracts/deployments/bond-yield/${chainId}.json`,
    ),
    "utf8",
  ),
);
const bondYieldServiceManagerAddress =
  avsDeploymentData.addresses.bondYieldServiceManager;
const bondYieldServiceManagerABI = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../abis/BondYieldServiceManager.json"),
    "utf8",
  ),
);
// Initialize contract objects from ABIs
const bondYieldServiceManager = new ethers.Contract(
  bondYieldServiceManagerAddress,
  bondYieldServiceManagerABI,
  wallet,
);

function readPoolId(): string {
  const deploymentsPath = path.resolve(
    __dirname,
    "../../contracts/config/hook/deployments.json",
  );
  const jsonData = fs.readFileSync(deploymentsPath, "utf-8");
  const deployments = JSON.parse(jsonData);
  const poolId = deployments.poolId?.address;
  return poolId;
}

async function createNewTask(poolId: string) {
  try {
    // Send a transaction to the createNewTask function
    const tx = await bondYieldServiceManager.createNewTask(poolId);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();

    console.log(`Transaction successful with hash: ${receipt.hash}`);
  } catch (error) {
    console.error("Error sending transaction:", error);
  }
}

// Function to create a new task with a random name every 15 seconds
function startCreatingTasks() {
  setInterval(() => {
    const poolId = readPoolId();
    console.log(`Creating new task with poolId: ${poolId}`);
    createNewTask(poolId);
  }, 10000);
}

// Start the process
startCreatingTasks();
