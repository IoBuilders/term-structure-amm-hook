import { createAnvil, Anvil } from "@viem/anvil";
import { describe, beforeAll, afterAll, it, expect } from "@jest/globals";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import util from "util";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const execAsync = util.promisify(exec);

async function loadJsonFile(filePath: string): Promise<any> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading file ${filePath}:`, error);
    return null;
  }
}

async function loadDeployments(): Promise<Record<string, any>> {
  const coreFilePath = path.join(
    __dirname,
    "..",
    "contracts",
    "deployments",
    "core",
    "31337.json",
  );
  const bondYieldFilePath = path.join(
    __dirname,
    "..",
    "contracts",
    "deployments",
    "bond-yield",
    "31337.json",
  );

  const [coreDeployment, bondYieldDeployment] = await Promise.all([
    loadJsonFile(coreFilePath),
    loadJsonFile(bondYieldFilePath),
  ]);

  if (!coreDeployment || !bondYieldDeployment) {
    console.error("Error loading deployments");
    return {};
  }

  return {
    core: coreDeployment,
    bondYield: bondYieldDeployment,
  };
}

describe("Operator Functionality", () => {
  let anvil: Anvil;
  let deployment: Record<string, any>;
  let provider: ethers.JsonRpcProvider;
  let signer: ethers.Wallet;
  let delegationManager: ethers.Contract;
  let bondYieldServiceManager: ethers.Contract;
  let ecdsaRegistryContract: ethers.Contract;
  let avsDirectory: ethers.Contract;

  beforeAll(async () => {
    anvil = createAnvil();
    await anvil.start();
    await execAsync("npm run deploy:core");
    await execAsync("npm run deploy:bond-yield");
    deployment = await loadDeployments();

    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

    const delegationManagerABI = await loadJsonFile(
      path.join(__dirname, "..", "abis", "IDelegationManager.json"),
    );
    const ecdsaRegistryABI = await loadJsonFile(
      path.join(__dirname, "..", "abis", "ECDSAStakeRegistry.json"),
    );
    const bondYieldServiceManagerABI = await loadJsonFile(
      path.join(__dirname, "..", "abis", "BondYieldServiceManager.json"),
    );
    const avsDirectoryABI = await loadJsonFile(
      path.join(__dirname, "..", "abis", "IAVSDirectory.json"),
    );

    delegationManager = new ethers.Contract(
      deployment.core.addresses.delegationManager,
      delegationManagerABI,
      signer,
    );
    bondYieldServiceManager = new ethers.Contract(
      deployment.bondYield.addresses.bondYieldServiceManager,
      bondYieldServiceManagerABI,
      signer,
    );
    ecdsaRegistryContract = new ethers.Contract(
      deployment.bondYield.addresses.stakeRegistry,
      ecdsaRegistryABI,
      signer,
    );
    avsDirectory = new ethers.Contract(
      deployment.core.addresses.avsDirectory,
      avsDirectoryABI,
      signer,
    );
  });

  it("should register as an operator", async () => {
    const tx = await delegationManager.registerAsOperator(
      "0x0000000000000000000000000000000000000000",
      0,
      "",
    );
    await tx.wait();

    const isOperator = await delegationManager.isOperator(signer.address);
    expect(isOperator).toBe(true);
  });

  it("should register operator to AVS", async () => {
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const expiry = Math.floor(Date.now() / 1000) + 3600;

    const operatorDigestHash =
      await avsDirectory.calculateOperatorAVSRegistrationDigestHash(
        signer.address,
        await bondYieldServiceManager.getAddress(),
        salt,
        expiry,
      );

    const operatorSigningKey = new ethers.SigningKey(process.env.PRIVATE_KEY!);
    const operatorSignedDigestHash =
      operatorSigningKey.sign(operatorDigestHash);
    const operatorSignature = ethers.Signature.from(
      operatorSignedDigestHash,
    ).serialized;

    const tx = await ecdsaRegistryContract.registerOperatorWithSignature(
      {
        signature: operatorSignature,
        salt: salt,
        expiry: expiry,
      },
      signer.address,
    );
    await tx.wait();

    const isRegistered = await ecdsaRegistryContract.operatorRegistered(
      signer.address,
    );
    expect(isRegistered).toBe(true);
  });

  it("should create a new task", async () => {
    const taskPoolId = ethers.encodeBytes32String("1");

    const tx = await bondYieldServiceManager.createNewTask(taskPoolId);
    await tx.wait();
  });

  it("should sign and respond to a task", async () => {
    const taskIndex = 0;
    const taskCreatedBlock = await provider.getBlockNumber();
    const taskPoolId = ethers.encodeBytes32String("1");
    const ytm = ethers.toBigInt(1);
    const messageHash = ethers.solidityPackedKeccak256(
      ["bytes32"],
      [taskPoolId],
    );
    const messageBytes = ethers.getBytes(messageHash);
    const signature = await signer.signMessage(messageBytes);

    const operators = [await signer.getAddress()];
    const signatures = [signature];
    const signedTask = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address[]", "bytes[]", "uint32"],
      [operators, signatures, ethers.toBigInt(taskCreatedBlock)],
    );

    const tx = await bondYieldServiceManager.respondToTask(
      { poolId: taskPoolId, taskCreatedBlock: taskCreatedBlock },
      taskIndex,
      signedTask,
      ytm,
    );
    await tx.wait();
  });

  afterAll(async () => {
    await anvil.stop();
  });
});
