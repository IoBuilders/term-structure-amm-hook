import { ApproveCommand, ERC20, NewERC20Command } from "@blockchain/ERC20";
import type Configuration from "@configuration";
import { HookInquirer, type CircleInquirer } from "@inquirer";
import { Account } from "@blockchain";
import type { AtsControlList } from "@blockchain/AtsControlList";
import { maxUint256, type Address } from "viem";

// * Utility function to connect the account to the tokens and the hook
export async function connectAccountToHookAndTokens({
  account,
  config,
  circleInquirer,
  accountType,
  atsControlList,
}: {
  account: Account;
  config: Configuration;
  circleInquirer: CircleInquirer;
  accountType: "valid" | "invalid" | "admin";
  atsControlList: AtsControlList;
}) {
  if (circleInquirer && circleInquirer.isApiComplianceEnabled()) {
    await circleInquirer.inquireComplianceCheck({
      accountAddress: account.address,
      askForIdempotencyKey: false,
    });
  }

  const bond_ = new ERC20(
    new NewERC20Command({
      address: config.atsBondAddr,
      account,
      atsControlList,
    }),
  );
  const eur_ = new ERC20(
    new NewERC20Command({ address: config.eurAddr, account, atsControlList }),
  );

  const hookInquirer_ = await HookInquirer.create({
    bond: bond_,
    eur: eur_,
    hookHubAddress: config.hookHubAddr,
    routerAddress: config.routerAddr,
    lpTokenAddress: config.lpTokenAddr,
    account,
  });

  if (accountType !== "invalid") {
    console.log("🔄 Approving tokens for hook hub...");
    await bond_.approve(
      new ApproveCommand({
        account: account.address,
        amount: maxUint256,
        to: config.hookHubAddr,
      }),
    );
    await eur_.approve(
      new ApproveCommand({
        account: account.address,
        amount: maxUint256,
        to: config.hookHubAddr,
      }),
    );
    console.log("✅ Approvals complete");
  }

  return { hookInquirer_, bond_, eur_ };
}

export async function changeConnectedAccount({
  hookInquirer,
  accountType,
  account,
  hookHubAddress,
  circleInquirer,
}: {
  hookInquirer: HookInquirer;
  accountType: "valid" | "invalid" | "admin";
  account: Account;
  hookHubAddress: Address;
  circleInquirer?: CircleInquirer;
}) {
  if (circleInquirer && circleInquirer.isApiComplianceEnabled()) {
    await circleInquirer.inquireComplianceCheck({
      accountAddress: account.address,
      askForIdempotencyKey: false,
    });
  }

  hookInquirer.account = account;
  if (accountType !== "invalid") {
    console.log("🔄 Approving tokens for hook hub...");
    await hookInquirer.bond.approve(
      new ApproveCommand({
        account: account.address,
        amount: maxUint256,
        to: hookHubAddress,
      }),
    );
    await hookInquirer.eur.approve(
      new ApproveCommand({
        account: account.address,
        amount: maxUint256,
        to: hookHubAddress,
      }),
    );
    console.log("✅ Approvals complete");
  }
}
