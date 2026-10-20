// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {PortfolioToken} from "../src/PortfolioToken.sol";

contract PortfolioTokenTest is Test {
    uint256 internal constant CAP = 1_000 ether;

    PortfolioToken internal token;
    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        token = new PortfolioToken(owner, CAP);
    }

    function test_nameSymbolAndCap() public view {
        assertEq(token.name(), "Portfolio Token");
        assertEq(token.symbol(), "PTK");
        assertEq(token.decimals(), 18);
        assertEq(token.cap(), CAP);
        assertEq(token.owner(), owner);
        assertEq(token.totalSupply(), 0);
    }

    function test_ownerCanMint() public {
        vm.prank(owner);
        token.mint(alice, 250 ether);

        assertEq(token.balanceOf(alice), 250 ether);
        assertEq(token.totalSupply(), 250 ether);
    }

    function test_mintUpToTheCap() public {
        vm.prank(owner);
        token.mint(alice, CAP);

        assertEq(token.totalSupply(), CAP);
        assertEq(token.balanceOf(alice), CAP);
    }

    function test_mintAboveTheCapReverts() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ERC20Capped.ERC20ExceededCap.selector, CAP + 1, CAP));
        token.mint(alice, CAP + 1);
    }

    function test_laterMintCannotCrossTheCap() public {
        vm.startPrank(owner);
        token.mint(alice, 600 ether);
        vm.expectRevert(abi.encodeWithSelector(ERC20Capped.ERC20ExceededCap.selector, 1_001 ether, CAP));
        token.mint(bob, 401 ether);
        vm.stopPrank();

        assertEq(token.totalSupply(), 600 ether);
        assertEq(token.balanceOf(bob), 0);
    }

    function test_nonOwnerCannotMint() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        token.mint(alice, 1 ether);

        assertEq(token.totalSupply(), 0);
    }

    function test_holderCanBurnOwnTokens() public {
        vm.prank(owner);
        token.mint(alice, 100 ether);

        vm.prank(alice);
        token.burn(40 ether);

        assertEq(token.balanceOf(alice), 60 ether);
        assertEq(token.totalSupply(), 60 ether);
    }

    function test_cannotBurnMoreThanBalance() public {
        vm.prank(owner);
        token.mint(alice, 10 ether);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, alice, 10 ether, 11 ether)
        );
        token.burn(11 ether);
    }

    function test_zeroCapReverts() public {
        vm.expectRevert(abi.encodeWithSelector(ERC20Capped.ERC20InvalidCap.selector, 0));
        new PortfolioToken(owner, 0);
    }
}
