import { input, select, Separator } from '@inquirer/prompts';
import Configuration, {
    BIG_SEPARATOR,
    CIRCLE_API_COMPLIANCE_NOT_ENABLED_WARN_MESSAGE,
    THEME,
} from '@configuration';
import { Account } from '@blockchain';
import { AtsInquirer, CircleInquirer, HookInquirer } from '@inquirer';
import { Circle, ComplianceStatus } from '@circle';
import {
    AtsControlList,
    NewAtsControlListCommand,
} from '@blockchain/AtsControlList';
import { maxUint256, type Address } from 'viem';
import { NewERC20Command, ApproveCommand, ERC20 } from '@blockchain/ERC20';
import Time from '@time';

let atsControlList: AtsControlList;
let bond, eur: ERC20;
let circleInquirer: CircleInquirer;
let atsInquirer: AtsInquirer;
let hookInquirer: HookInquirer;

let accountType: 'valid' | 'invalid' | 'admin';
let account: Account;

// * Configuration Phase
console.log(`\n 🎉 Welcome to TermStructure AMM Hook Demo! 🎉 \n`);
const config = await Configuration.fromEnv();
circleInquirer = new CircleInquirer(
    new Circle({
        apiKey: config.circleApiKey,
        apiComplianceScreeningUrl: config.circleApiComplianceScreeningUrl,
        apiComplianceScreeningChain: config.circleApiComplianceScreeningChain,
        apiComplianceEnabled: config.circleApiComplianceEnabled,
    })
);
console.log(`✅ RPC URL set to ${config.rpcUrl}`);
console.log(`✅ ATS Bond address set to ${config.atsBondAddr}`);
console.log(`✅ Hook address set to ${config.hookHubAddr}`);
if (config.circleApiComplianceEnabled) {
    console.log(
        `✅ Circle API compliance check \x1b[32menabled\x1b[0m with:`,
        `\n - API Key: ${config.obfuscatedCircleApiKey}`,
        `\n - API Chain: ${config.circleApiComplianceScreeningChain}`
    );
} else {
    console.warn(CIRCLE_API_COMPLIANCE_NOT_ENABLED_WARN_MESSAGE);
}
console.log(new Separator().separator);
const adminAccount = new Account({
    privateKey: config.privateKeyAdmin,
    rpcUrl: config.rpcUrl,
});
// Wait for blockchain check
await Time.wait({ duration: 1 });
accountType = await select({
    message: '🔑 Please select the type of account to use:',
    choices: [
        {
            name: '😇 Valid Account',
            value: 'valid',
            description: 'Use a valid | compliant account for testing',
        },
        {
            name: '😈 Invalid Account',
            value: 'invalid',
            description: 'Use an invalid | non-compliant account for testing',
        },
        new Separator(),
        {
            name: '⚙️  Admin Account',
            value: 'admin',
            description: 'Use the admin account for testing',
        },
    ],
    theme: THEME,
});
if (accountType === 'valid') {
    account = new Account({
        privateKey: config.privateKeyValid,
        rpcUrl: config.rpcUrl,
    });
} else if (accountType === 'invalid') {
    account = new Account({
        privateKey: config.privateKeyInvalid,
        rpcUrl: config.rpcUrl,
    });
} else if (accountType === 'admin') {
    account = new Account({
        privateKey: config.privateKeyAdmin,
        rpcUrl: config.rpcUrl,
    });
} else {
    account = adminAccount;
}
console.log(
    `[⚙️ Admin Backend⚙️ ] Admin account address set: ${adminAccount.address}`
);
console.log(
    `✅ 🔑 Account successfully loaded! 🚀 Using address: ${account.address}`
);

// * Initialization Phase
atsControlList = new AtsControlList(
    new NewAtsControlListCommand({
        address: config.atsBondAddr,
        account: adminAccount,
    })
);
// As soon as the user connects we check the status
if (circleInquirer && circleInquirer.isApiComplianceEnabled()) {
    await circleInquirer.inquireComplianceCheck({
        accountAddress: account.address,
        askForIdempotencyKey: false,
    });
}
atsInquirer = new AtsInquirer(atsControlList);
console.log(
    `✅ 📄 ATS Bond successfully loaded! 🚀 Using address: ${config.atsBondAddr}`
);

hookInquirer = await HookInquirer.create({
    bondAddress: config.atsBondAddr,
    eurAddress: config.eurAddr,
    hookHubAddress: config.hookHubAddr,
    routerAddress: config.routerAddr,
    lpTokenAddress: config.lpTokenAddr,
    account,
});
console.log(
    `✅ 📄 Hook Hub successfully loaded! 🚀 Using address: ${config.hookHubAddr}`
);
// Instantiate pool tokens and grant unlimited approval
console.log('Granting approvals to the hook hub...');
bond = new ERC20(
    new NewERC20Command({
        address: config.atsBondAddr,
        account,
        atsControlList,
    })
);
eur = new ERC20(
    new NewERC20Command({ address: config.eurAddr, account, atsControlList })
);

if (accountType != 'admin') {
    await bond.approve(
        new ApproveCommand({
            account: account.address,
            amount: maxUint256,
            to: config.hookHubAddr,
        })
    );
    await eur.approve(
        new ApproveCommand({
            account: account.address,
            amount: maxUint256,
            to: config.hookHubAddr,
        })
    );
}

console.log(new Separator().separator);
// * Interaction Phase
console.log(`🚀 Ready to interact with the Term structure AMM! 🚀`);
let action: string;
do {
    action = await select({
        message: 'Please select an action to perform:',
        choices: [
            {
                name: '🔁 Perform Swap',
                value: 'swap',
                description: 'Perform a swap',
            },
            {
                name: '💸 Modify Liqudity',
                value: 'modifyLiqudity',
                description: 'Add or remove liqudity',
            },
            new Separator(),
            {
                name: '🔍 Check ATS Control List',
                value: 'checkControlList',
                description: 'Check if the address is in the ATS Control List',
            },
            {
                name: '🔍 Check wallet compliance status',
                value: 'checkWalletCompliance',
                description:
                    'Check the compliance status of an address using the Circle API',
                disabled:
                    !circleInquirer || !circleInquirer.isApiComplianceEnabled(),
            },
            {
                name: '➕ Add to ATS Control List',
                value: 'addToControlList',
                description:
                    'Add the address to the ATS Control List (if not already present)',
                disabled: accountType !== 'admin',
            },
            {
                name: '➖ Remove from ATS Control List',
                value: 'removeFromControlList',
                description:
                    'Remove the address from the ATS Control List (if present)',
                disabled: accountType !== 'admin',
            },
            new Separator(),
            {
                name: '⚙️  Change account',
                value: 'changeAccount',
                description: 'Change the account to use for the actions',
            },
            new Separator(),
            {
                name: '🫣 Exit',
                value: 'exit',
                description: 'Exit the program',
            },
        ],
        theme: THEME,
        loop: false,
    });

    let timeToSleepAfterAction = 4; // seconds default
    switch (action) {
        case 'swap':
            const swapResult = await hookInquirer.inquireSwap({
                address: account.address,
            });

            if (swapResult) {
                console.log(`✅ Swap succesfully executed.`);
                console.log(
                    `Your current bonds balance is ${swapResult.bondBlanace}.`
                );
                console.log(
                    `Your current eurs balance is ${swapResult.eurBalance}.`
                );
            } else {
                console.log(`❌ The swap has not been succesful.`);
            }
            timeToSleepAfterAction = 15; // seconds
            break;
        case 'modifyLiqudity':
            const modifyLiqudityResult =
                await hookInquirer.inquireModifyLiquidity({
                    address: account.address,
                });

            if (modifyLiqudityResult) {
                console.log(`✅ Modify liquidity succesfully executed.`);
                console.log(
                    `Your current bonds balance is ${modifyLiqudityResult.bondBlanace}.`
                );
                console.log(
                    `Your current eurs balance is ${modifyLiqudityResult.eurBalance}.`
                );
                console.log(
                    `Your current LP tokens balance is ${modifyLiqudityResult.lpTokenBalance}.`
                );
            } else {
                console.log(`❌ Liqudity modification has not been succesful.`);
            }
            timeToSleepAfterAction = 15; // seconds
            break;
        case 'checkControlList':
            const accountToCheck = await input({
                message: `🔑 Specify the account to check`,
                required: false,
                default: account.address,
                theme: THEME,
            });
            console.log(`🔍 Checking ATS Control List...`);
            const isInControlList = await atsInquirer.inquireIsInControlList({
                accountToCheck: accountToCheck as Address,
            });
            console.log(
                `✅ Address ${accountToCheck} is ${
                    isInControlList ? '' : 'NOT '
                }in the ATS Control List.`
            );
            timeToSleepAfterAction = 2; // seconds
            break;

        case 'addToControlList':
            const accountToAdd = await input({
                message: `🔑 Specify the account to add: `,
                required: false,
                theme: THEME,
            });
            console.log(`➕ Adding address to ATS Control List...`);
            const addToControlListResponse =
                await atsInquirer.inquireAddToControlList({
                    accountToAdd: accountToAdd as Address,
                });
            if (addToControlListResponse) {
                console.log(
                    `✅ Address ${accountToAdd} added to the ATS Control List successfully!`
                );
            } else {
                console.log(
                    `❌ Address ${accountToAdd} was NOT added to the ATS Control List.`
                );
            }
            timeToSleepAfterAction = 6; // seconds
            break;
        case 'removeFromControlList':
            const accountToRemove = await input({
                message: '🔑 Specify the account to remove: ',
                required: false,
                theme: THEME,
            });
            console.log(`➖ Removing address from ATS Control List...`);
            const removeFromControlListResponse =
                await atsInquirer.inquireRemoveFromControlList({
                    accountToRemove: accountToRemove as Address,
                });
            if (removeFromControlListResponse) {
                console.log(
                    `✅ Address ${accountToRemove} removed from the ATS Control List successfully!`
                );
            } else {
                console.log(
                    `❌ Address ${accountToRemove} was NOT removed from the ATS Control List.`
                );
            }
            timeToSleepAfterAction = 6; // seconds
            break;
        case 'checkWalletCompliance':
            const accountToCheckCompliance = await input({
                message:
                    '🔑 Specify the account to check the compliance status',
                required: false,
                default: account.address,
                theme: THEME,
            });
            console.log(
                `🔍 Checking Circle API compliance and Update ATS Control List...`
            );
            const complianceStatusResponse =
                await circleInquirer.inquireComplianceCheck({
                    accountAddress: accountToCheckCompliance as Address,
                    askForIdempotencyKey: true,
                });
            if (
                complianceStatusResponse.complianceStatus ===
                ComplianceStatus.APPROVED
            ) {
                console.log(
                    `✅ Address ${accountToCheckCompliance} \x1b[32mis compliant\x1b[0m! 🎉`
                );
            } else if (
                complianceStatusResponse.complianceStatus ===
                ComplianceStatus.DENIED
            ) {
                console.log(
                    `🚨 Address ${accountToCheckCompliance} is \x1b[31mNOT compliant\x1b[0m! 🚨`
                );
            } else {
                console.error(
                    `❌ Unexpected compliance status: ${complianceStatusResponse.complianceStatus}`
                );
            }
            timeToSleepAfterAction = 10; // seconds
            break;

        case 'changeAccount':
            accountType = await select({
                message: '🔑 Please select the type of account to use:',
                choices: [
                    {
                        name: '😇 Valid Account',
                        value: 'valid',
                        description:
                            'Use a valid | compliant account for testing',
                    },
                    {
                        name: '😈 Invalid Account',
                        value: 'invalid',
                        description:
                            'Use an invalid | non-compliant account for testing',
                    },
                    new Separator(),
                    {
                        name: '⚙️ Admin Account',
                        value: 'admin',
                        description: 'Use the admin account for testing',
                    },
                ],
                theme: THEME,
            });
            if (accountType === 'valid') {
                account = new Account({
                    privateKey: config.privateKeyValid,
                    rpcUrl: config.rpcUrl,
                });
            } else if (accountType === 'invalid') {
                account = new Account({
                    privateKey: config.privateKeyInvalid,
                    rpcUrl: config.rpcUrl,
                });
            } else if (accountType === 'admin') {
                account = adminAccount;
            } else {
                account = adminAccount;
            }
            console.log(
                `✅ 🔑 Account successfully loaded! 🚀 Using address: ${account.address}`
            );
            if (circleInquirer && circleInquirer.isApiComplianceEnabled()) {
                await circleInquirer.inquireComplianceCheck({
                    accountAddress: account.address,
                    askForIdempotencyKey: false,
                });
            }
            timeToSleepAfterAction = 2; // seconds
            break;

        case 'exit':
            console.log('👋 Goodbye! 👋');
            break;
    }
    if (action !== 'exit') {
        await Time.wait({ duration: timeToSleepAfterAction, unit: 'seconds' });
        console.log(BIG_SEPARATOR);
    }
} while (action !== 'exit');
// * Exit
process.exit(0);
