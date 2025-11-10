// smart-contracts/script/Deploy.s.sol
pragma solidity ^0.8.19;

import "@forge-std/Script.sol";
import "../src/FROSTCoordinator.sol"; // <-- Import your contract

contract DeployScript is Script {
    function run() public returns (FROSTCoordinator) {
        vm.startBroadcast();

        // Deploy your contract
        FROSTCoordinator coordinator = new FROSTCoordinator{ salt: bytes32(0) }();

        vm.stopBroadcast();

        // Log the deployed address
        console.log("FROSTCoordinator deployed to:", address(coordinator));
        return coordinator;
    }
}