# Load .env
ifneq (,$(wildcard .env))
include .env
export
endif

############################# HELP MESSAGE #############################
.PHONY: help
help:
	@grep -hE '^[A-Za-z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

___INSTALLATION___: ##
install: ## installs and sets up ATS and Uniswap libraries
	forge install
	@cd lib/asset-tokenization-studio/contracts && npm ci && \
	if [ "$$(uname)" = "Darwin" ]; then \
	    find . -name '*.sol' -type f -exec sed -i '' \
	        's/^pragma solidity .*;/pragma solidity ^0.8.18;/' {} +; \
	else \
	    find . -name '*.sol' -type f -exec sed -i \
	        's/^pragma solidity .*;/pragma solidity ^0.8.18;/' {} +; \
	fi

___ANVIL_STATE___: ##
build-anvil-state-with-deployed-contracts: ## spins up anvil with the ATS infrastructure deployed
	@chmod +x ./deployAtsInfrastructure.sh
	./deployAtsInfrastructure.sh

___CONTRACTS___: ##
build-contracts: ## builds contracts
	forge build

deploy-bond: ## deploys pool manager, bond hook and bond
	@if [ ! -f config/hook/deployments.json ]; then \
		mkdir -p config/hook && touch config/hook/deployments.json; \
	fi
	forge script script/01_DeployBondHookHub.s.sol --rpc-url ${LOCAL_RPC_URL} --broadcast --private-key ${PRIVATE_KEY_ADMIN}
	forge script script/02_DeployBond.s.sol --rpc-url ${LOCAL_RPC_URL} --broadcast --private-key ${PRIVATE_KEY_ADMIN}
	@cast rpc evm_increaseTime 86400 --rpc-url ${LOCAL_RPC_URL}
	@cast rpc evm_mine --rpc-url ${LOCAL_RPC_URL}

launch-pool: ## launches pool for the deployed bond
	forge script script/03_LaunchPool.s.sol --rpc-url ${LOCAL_RPC_URL} --broadcast --private-key ${PRIVATE_KEY_ADMIN}

test-contracts: ## run contracts tests with coverage
	forge coverage

___DEMO___: ##
start-operator: ## deploy hook and start operator in one terminal
	make deploy-bond
	cd ../avs && cp .env.example .env && cp contracts/.env.example contracts/.env \
	&& npm run build:forge && npm run deploy:core && npm run deploy:bond-yield
	make launch-pool
	cd ../avs && npm run extract:abis && npm install && npm run start:operator
start-traffic: ## start in a new terminal traffic
	cd ../avs && npm run start:traffic

stop-anvil: ## stops anvil
	killall anvil