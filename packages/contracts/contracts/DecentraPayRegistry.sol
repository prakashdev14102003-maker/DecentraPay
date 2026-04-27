// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./CarbonCredit.sol";

/**
 * @title DecentraPayRegistry
 * @notice Anchors SHA-256 audit hashes on-chain and issues carbon credits.
 *         Only VERIFIER_ROLE can anchor audits and issue credits.
 */
contract DecentraPayRegistry is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    CarbonCredit public carbonCredit;

    struct AuditAnchor {
        bytes32 auditHash;
        uint256 emissionKg;
        uint64 period;
        uint64 timestamp;
    }

    // company => period => AuditAnchor
    mapping(address => mapping(uint64 => AuditAnchor)) public anchors;

    event AuditAnchored(
        address indexed company,
        uint64 indexed period,
        bytes32 auditHash,
        uint256 emissionKg
    );
    event CreditsIssued(
        address indexed company,
        uint64 indexed period,
        uint256 amount
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address _carbonCredit
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);

        carbonCredit = CarbonCredit(_carbonCredit);
    }

    /**
     * @notice Anchor an audit report hash on-chain. Tamper-evident trail.
     */
    function anchorAudit(
        address company,
        uint64 period,
        bytes32 auditHash,
        uint256 emissionKg
    ) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        require(company != address(0), "Invalid company address");
        require(auditHash != bytes32(0), "Empty audit hash");
        require(
            anchors[company][period].timestamp == 0,
            "Audit already anchored for this period"
        );

        anchors[company][period] = AuditAnchor({
            auditHash: auditHash,
            emissionKg: emissionKg,
            period: period,
            timestamp: uint64(block.timestamp)
        });

        emit AuditAnchored(company, period, auditHash, emissionKg);
    }

    /**
     * @notice Issue carbon credits to a company. Calls CarbonCredit.mint().
     */
    function issueCredits(
        address company,
        uint256 amount,
        uint64 period
    ) external onlyRole(VERIFIER_ROLE) whenNotPaused {
        require(company != address(0), "Invalid company address");
        require(amount > 0, "Amount must be positive");
        require(
            anchors[company][period].timestamp > 0,
            "Audit must be anchored first"
        );

        bytes32 periodBytes = bytes32(uint256(period));
        carbonCredit.mint(company, amount, periodBytes);

        emit CreditsIssued(company, period, amount);
    }

    /**
     * @notice Verify an audit hash against the on-chain anchor.
     */
    function verifyAuditHash(
        address company,
        uint64 period,
        bytes32 auditHash
    ) external view returns (bool) {
        return anchors[company][period].auditHash == auditHash;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
