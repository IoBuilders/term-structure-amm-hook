import { ethers, parseEther } from "ethers";
import * as dotenv from "dotenv";
const fs = require("fs");
const path = require("path");
dotenv.config();

// Check if the process.env object is empty
if (!Object.keys(process.env).length) {
  throw new Error("process.env object is empty");
}

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
// Load core deployment data
const coreDeploymentData = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, `../contracts/deployments/core/${chainId}.json`),
    "utf8",
  ),
);

const delegationManagerAddress = coreDeploymentData.addresses.delegationManager; // todo: reminder to fix the naming of this contract in the deployment file, change to delegationManager
const avsDirectoryAddress = coreDeploymentData.addresses.avsDirectory;
const bondYieldServiceManagerAddress =
  avsDeploymentData.addresses.bondYieldServiceManager;
const oracleConsumerAddress = avsDeploymentData.addresses.oracleConsumer;
const ecdsaStakeRegistryAddress = avsDeploymentData.addresses.stakeRegistry;

// Load ABIs
const delegationManagerABI = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../abis/IDelegationManager.json"),
    "utf8",
  ),
);
const ecdsaRegistryABI = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../abis/ECDSAStakeRegistry.json"),
    "utf8",
  ),
);
const bondYieldServiceManagerABI = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../abis/BondYieldServiceManager.json"),
    "utf8",
  ),
);
const oracleConsumerABI = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../abis/IOracleConsumer.json"),
    "utf8",
  ),
);
const avsDirectoryABI = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../abis/IAVSDirectory.json"),
    "utf8",
  ),
);

// Initialize contract objects from ABIs
const delegationManager = new ethers.Contract(
  delegationManagerAddress,
  delegationManagerABI,
  wallet,
);
const bondYieldServiceManager = new ethers.Contract(
  bondYieldServiceManagerAddress,
  bondYieldServiceManagerABI,
  wallet,
);
const oracleConsumer = new ethers.Contract(
  oracleConsumerAddress,
  oracleConsumerABI,
  wallet,
);
const ecdsaRegistryContract = new ethers.Contract(
  ecdsaStakeRegistryAddress,
  ecdsaRegistryABI,
  wallet,
);
const avsDirectory = new ethers.Contract(
  avsDirectoryAddress,
  avsDirectoryABI,
  wallet,
);

let ytm;

const signAndRespondToTask = async (
  taskIndex: number,
  taskCreatedBlock: number,
  poolId: string,
) => {
  const messageHash = ethers.solidityPackedKeccak256(["bytes32"], [poolId]);
  const messageBytes = ethers.getBytes(messageHash);
  const signature = await wallet.signMessage(messageBytes);

  console.log(`Signing and responding to task ${taskIndex}`);

  const operators = [await wallet.getAddress()];
  const signatures = [signature];
  const signedTask = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address[]", "bytes[]", "uint32"],
    [operators, signatures, taskCreatedBlock],
  );

  const currentYtm = (await oracleConsumer.getBondHookConfigData(poolId)).ytm;
  const jitterAmount = (Math.random() * 0.002 - 0.001).toFixed(18);
  ytm = currentYtm + parseEther(jitterAmount);

  const tx = await bondYieldServiceManager.respondToTask(
    { poolId: poolId, taskCreatedBlock: taskCreatedBlock },
    taskIndex,
    signedTask,
    ytm,
  );

  await tx.wait();
  console.log(`Responded to task.`);
};

const registerOperator = async () => {
  // Registers as an Operator in EigenLayer.
  try {
    const tx1 = await delegationManager.registerAsOperator(
      "0x0000000000000000000000000000000000000000", // initDelegationApprover
      0, // allocationDelay
      "", // metadataURI
    );
    await tx1.wait();
    console.log("Operator registered to Core EigenLayer contracts");
  } catch (error) {
    console.error("Error in registering as operator:", error);
  }

  const salt = ethers.hexlify(ethers.randomBytes(32));
  const expiry = ethers.MaxInt256; // Example expiry, 1 hour from now

  // Define the output structure
  let operatorSignatureWithSaltAndExpiry = {
    signature: "",
    salt: salt,
    expiry: expiry,
  };

  // Calculate the digest hash, which is a unique value representing the operator, avs, unique value (salt) and expiration date.
  const operatorDigestHash =
    await avsDirectory.calculateOperatorAVSRegistrationDigestHash(
      wallet.address,
      await bondYieldServiceManager.getAddress(),
      salt,
      expiry,
    );
  console.log(operatorDigestHash);

  // Sign the digest hash with the operator's private key
  console.log("Signing digest hash with operator's private key");
  const operatorSigningKey = new ethers.SigningKey(process.env.PRIVATE_KEY!);
  const operatorSignedDigestHash = operatorSigningKey.sign(operatorDigestHash);

  // Encode the signature in the required format
  operatorSignatureWithSaltAndExpiry.signature = ethers.Signature.from(
    operatorSignedDigestHash,
  ).serialized;

  console.log("Registering Operator to AVS Registry contract");

  // Register Operator to AVS
  // Per release here: https://github.com/Layr-Labs/eigenlayer-middleware/blob/v0.2.1-mainnet-rewards/src/unaudited/ECDSAStakeRegistry.sol#L49
  const tx2 = await ecdsaRegistryContract.registerOperatorWithSignature(
    operatorSignatureWithSaltAndExpiry,
    wallet.address,
  );
  await tx2.wait();
  console.log("Operator registered on AVS successfully");
};

const monitorNewTasks = async () => {
  bondYieldServiceManager.on(
    "NewTaskCreated",
    async (taskIndex: number, task: any) => {
      console.log(`New task detected: ${task.poolId}`);
      await signAndRespondToTask(taskIndex, task.taskCreatedBlock, task.poolId);
      const config = await oracleConsumer.getBondHookConfigData(task.poolId);
      console.log(`Current YTM: ${config.ytm}`);
    },
  );

  console.log("Monitoring for new tasks...");
};

const main = async () => {
  await registerOperator();
  monitorNewTasks().catch((error) => {
    console.error("Error monitoring tasks:", error);
  });
};

main().catch((error) => {
  console.error("Error in main function:", error);
});
