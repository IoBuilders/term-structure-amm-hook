import { input } from '@inquirer/prompts';
import { isAddress, type Address } from 'viem';
import { THEME } from '@configuration';
import type { Circle, ComplianceCheckResponse } from '@circle';

export default class CircleInquirer {
    private _circle: Circle;

    constructor(circle: Circle) {
        this._circle = circle;
    }

    public async inquireComplianceCheck({
        accountAddress,
        askForIdempotencyKey = false,
    }: {
        accountAddress: Address;
        askForIdempotencyKey?: boolean;
    }): Promise<ComplianceCheckResponse> {
        // Validate the address format (basic validation)
        if (!isAddress(accountAddress)) {
            throw new Error(`Invalid address format: ${accountAddress}`);
        }
        const idempotencyKey = askForIdempotencyKey
            ? await input({
                  message: '🔑 Enter an idempotency key (optional): ',
                  required: false,
                  theme: THEME,
              })
            : undefined;
        console.log(`👀 Checking compliance for address: ${accountAddress}`);
        try {
            const response = await this._circle.checkCompliance({
                address: accountAddress,
                idempotencyKey:
                    idempotencyKey == '' ? undefined : idempotencyKey,
            });
            console.log(
                `Compliance check completed for address: ${accountAddress}`
            );
            return response;
        } catch (error) {
            if (error instanceof Error) {
                console.error(`❌ Error checking compliance: ${error.message}`);
                throw error;
            } else {
                console.error(`❌ Error checking compliance: ${String(error)}`);
                throw new Error(
                    `❌ Error checking compliance: ${String(error)}`
                );
            }
        }
    }

    public isApiComplianceEnabled(): boolean {
        return this._circle.isApiComplianceEnabled;
    }
}
