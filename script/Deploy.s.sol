// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {PortfolioToken} from "../src/PortfolioToken.sol";

/// @notice Deploys Portfolio Token with a cap of 1,000,000 PTK. The broadcasting account becomes the owner.
contract Deploy is Script {
    uint256 internal constant CAP = 1_000_000 ether;

    function run() external returns (PortfolioToken token) {
        address deployer = msg.sender;

        // A local Anvil node can send from an unlocked account. A testnet deploy
        // instead reads PRIVATE_KEY from the environment.
        if (vm.envExists("PRIVATE_KEY")) {
            uint256 deployerKey = vm.envUint("PRIVATE_KEY");
            deployer = vm.addr(deployerKey);
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast(deployer);
        }

        token = new PortfolioToken(deployer, CAP);
        vm.stopBroadcast();

        console.log("PortfolioToken", address(token));
        console.log("owner", token.owner());
        console.log("cap", token.cap());

        vm.writeFile(
            "./web/public/addresses.json",
            string.concat('{"token":"', vm.toString(address(token)), '"}')
        );
    }
}
