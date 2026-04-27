// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title CarbonCredit
 * @notice ERC-20 token representing carbon credits. 1 token = 1 tonne CO₂e.
 *         18 decimals. Only the MINTER_ROLE (granted to the Registry) can mint.
 */
contract CarbonCredit is
    Initializable,
    ERC20Upgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    event Issued(address indexed to, uint256 amount, bytes32 indexed period);
    event Retired(address indexed by, uint256 amount, bytes32 reason);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) public initializer {
        __ERC20_init("DecentraPay Carbon Credit", "DCC");
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    /**
     * @notice Mint carbon credits. Only callable by MINTER_ROLE (Registry).
     */
    function mint(
        address to,
        uint256 amount,
        bytes32 period
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        _mint(to, amount);
        emit Issued(to, amount, period);
    }

    /**
     * @notice Retire (burn) your own credits permanently.
     */
    function retire(uint256 amount, bytes32 reason) external whenNotPaused {
        _burn(msg.sender, amount);
        emit Retired(msg.sender, amount, reason);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
