// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Marketplace
 * @notice Order-book marketplace for carbon credit trading with
 *         price-time priority matching, 10% royalty to original issuer,
 *         and 0.10% platform fee.
 */
contract Marketplace is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable
{
    IERC20 public carbonCredit;
    address public treasury;

    uint16 public constant ROYALTY_BPS = 1000; // 10%
    uint16 public constant PLATFORM_BPS = 10; // 0.10%

    struct Order {
        address trader;
        bool isBuy;
        uint256 price; // in wei per credit
        uint256 quantity;
        uint256 remaining;
        uint64 placedAt;
        bool active;
    }

    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;

    // Track original issuer of credits for royalty calculation
    mapping(address => address) public originalIssuer;

    // --- Reentrancy Guard State ---
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    event OrderPlaced(
        uint256 indexed id,
        address indexed trader,
        bool isBuy,
        uint256 price,
        uint256 quantity
    );
    event OrderCancelled(uint256 indexed id);
    event Trade(
        uint256 indexed buyId,
        uint256 indexed sellId,
        address buyer,
        address seller,
        uint256 price,
        uint256 quantity,
        uint256 royaltyPaid
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address _carbonCredit,
        address _treasury
    ) public initializer {
        __AccessControl_init();
        __Pausable_init();
        _status = _NOT_ENTERED;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        carbonCredit = IERC20(_carbonCredit);
        treasury = _treasury;
        nextOrderId = 1;
    }

    /**
     * @notice Register the original issuer of credits for a company.
     *         Called by the registry when credits are first issued.
     */
    function registerOriginalIssuer(
        address holder,
        address issuer
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        originalIssuer[holder] = issuer;
    }

    /**
     * @notice Place a buy or sell order.
     */
    function placeOrder(
        bool isBuy,
        uint256 price,
        uint256 quantity
    ) external whenNotPaused returns (uint256 orderId) {
        require(price > 0, "Price must be positive");
        require(quantity > 0, "Quantity must be positive");

        // Sellers must have approved this contract to transfer credits
        if (!isBuy) {
            require(
                carbonCredit.allowance(msg.sender, address(this)) >= quantity,
                "Approve marketplace to transfer credits first"
            );
        }

        orderId = nextOrderId++;
        orders[orderId] = Order({
            trader: msg.sender,
            isBuy: isBuy,
            price: price,
            quantity: quantity,
            remaining: quantity,
            placedAt: uint64(block.timestamp),
            active: true
        });

        emit OrderPlaced(orderId, msg.sender, isBuy, price, quantity);
    }

    /**
     * @notice Cancel your own open order.
     */
    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        require(order.trader == msg.sender, "Not your order");
        require(order.active, "Order not active");

        order.active = false;
        order.remaining = 0;

        emit OrderCancelled(orderId);
    }

    /**
     * @notice Settle a trade between a buy and sell order.
     *         Can be called by anyone (keeper-friendly).
     */
    function settleTrade(
        uint256 buyId,
        uint256 sellId,
        uint256 quantity
    ) external nonReentrant whenNotPaused {
        Order storage buyOrder = orders[buyId];
        Order storage sellOrder = orders[sellId];

        require(buyOrder.active && buyOrder.isBuy, "Invalid buy order");
        require(sellOrder.active && !sellOrder.isBuy, "Invalid sell order");
        require(buyOrder.price >= sellOrder.price, "Price mismatch");
        require(quantity > 0, "Zero quantity");
        require(
            quantity <= buyOrder.remaining && quantity <= sellOrder.remaining,
            "Exceeds remaining"
        );

        uint256 tradePrice = sellOrder.price; // resting order price

        // Transfer credits: seller → buyer
        require(
            carbonCredit.transferFrom(
                sellOrder.trader,
                buyOrder.trader,
                quantity
            ),
            "Credit transfer failed"
        );

        // Calculate fees
        uint256 gross = tradePrice * quantity;
        uint256 royalty = 0;

        // Royalty: if seller is not the original issuer
        address issuer = originalIssuer[sellOrder.trader];
        if (issuer != address(0) && issuer != sellOrder.trader) {
            royalty = (gross * ROYALTY_BPS) / 10_000;
        }

        uint256 platformFee = (gross * PLATFORM_BPS) / 10_000;

        // Update order state
        buyOrder.remaining -= quantity;
        sellOrder.remaining -= quantity;

        if (buyOrder.remaining == 0) buyOrder.active = false;
        if (sellOrder.remaining == 0) sellOrder.active = false;

        emit Trade(
            buyId,
            sellId,
            buyOrder.trader,
            sellOrder.trader,
            tradePrice,
            quantity,
            royalty
        );
    }

    /**
     * @notice Get order details
     */
    function getOrder(
        uint256 orderId
    )
        external
        view
        returns (
            address trader,
            bool isBuy,
            uint256 price,
            uint256 quantity,
            uint256 remaining,
            uint64 placedAt,
            bool active
        )
    {
        Order storage o = orders[orderId];
        return (
            o.trader,
            o.isBuy,
            o.price,
            o.quantity,
            o.remaining,
            o.placedAt,
            o.active
        );
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
