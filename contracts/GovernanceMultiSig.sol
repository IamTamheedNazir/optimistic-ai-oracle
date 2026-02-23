// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GovernanceMultiSig
 * @notice Multi-signature governance for critical oracle operations
 * @dev Implements time-locked multi-sig for production security
 * 
 * Features:
 * - Multi-signature approval (configurable threshold)
 * - Time-locked execution (24-48 hour delay)
 * - Emergency pause mechanism
 * - Role-based access control
 * - Proposal system for parameter changes
 */
contract GovernanceMultiSig {
    
    // Proposal types
    enum ProposalType {
        PARAMETER_CHANGE,   // Change oracle parameters
        EMERGENCY_PAUSE,    // Pause the oracle
        EMERGENCY_UNPAUSE,  // Unpause the oracle
        UPGRADE_CONTRACT,   // Upgrade oracle contract
        ADD_SIGNER,         // Add new signer
        REMOVE_SIGNER,      // Remove signer
        CHANGE_THRESHOLD    // Change approval threshold
    }
    
    // Proposal status
    enum ProposalStatus {
        PENDING,
        APPROVED,
        EXECUTED,
        CANCELLED,
        EXPIRED
    }
    
    // Proposal structure
    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address proposer;
        bytes data;
        uint256 approvalCount;
        uint256 createdAt;
        uint256 executionTime;
        ProposalStatus status;
        mapping(address => bool) approvals;
        string description;
    }
    
    // Events
    event ProposalCreated(uint256 indexed proposalId, ProposalType proposalType, address proposer);
    event ProposalApproved(uint256 indexed proposalId, address approver, uint256 approvalCount);
    event ProposalExecuted(uint256 indexed proposalId, address executor);
    event ProposalCancelled(uint256 indexed proposalId, address canceller);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event ThresholdChanged(uint256 oldThreshold, uint256 newThreshold);
    event EmergencyPause(address indexed initiator);
    event EmergencyUnpause(address indexed initiator);
    
    // State
    mapping(uint256 => Proposal) public proposals;
    mapping(address => bool) public signers;
    address[] public signerList;
    uint256 public threshold;
    uint256 public proposalCount;
    uint256 public timelock = 24 hours;
    bool public paused;
    
    // Oracle contract reference
    address public oracleContract;
    
    // Modifiers
    modifier onlySigner() {
        require(signers[msg.sender], "Not a signer");
        _;
    }
    
    modifier proposalExists(uint256 proposalId) {
        require(proposalId < proposalCount, "Proposal does not exist");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    /**
     * @notice Initialize the multi-sig governance
     * @param _signers Initial list of signers
     * @param _threshold Number of approvals required
     * @param _oracleContract Address of the oracle contract
     */
    constructor(
        address[] memory _signers,
        uint256 _threshold,
        address _oracleContract
    ) {
        require(_signers.length >= _threshold, "Invalid threshold");
        require(_threshold > 0, "Threshold must be > 0");
        require(_oracleContract != address(0), "Invalid oracle address");
        
        for (uint256 i = 0; i < _signers.length; i++) {
            address signer = _signers[i];
            require(signer != address(0), "Invalid signer");
            require(!signers[signer], "Duplicate signer");
            
            signers[signer] = true;
            signerList.push(signer);
        }
        
        threshold = _threshold;
        oracleContract = _oracleContract;
    }
    
    /**
     * @notice Create a new proposal
     * @param proposalType Type of proposal
     * @param data Encoded proposal data
     * @param description Human-readable description
     * @return proposalId The ID of the created proposal
     */
    function createProposal(
        ProposalType proposalType,
        bytes memory data,
        string memory description
    ) external onlySigner notPaused returns (uint256 proposalId) {
        proposalId = proposalCount++;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposalType = proposalType;
        proposal.proposer = msg.sender;
        proposal.data = data;
        proposal.approvalCount = 0;
        proposal.createdAt = block.timestamp;
        proposal.executionTime = block.timestamp + timelock;
        proposal.status = ProposalStatus.PENDING;
        proposal.description = description;
        
        emit ProposalCreated(proposalId, proposalType, msg.sender);
        
        return proposalId;
    }
    
    /**
     * @notice Approve a proposal
     * @param proposalId The proposal to approve
     */
    function approveProposal(uint256 proposalId) 
        external 
        onlySigner 
        proposalExists(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.PENDING, "Proposal not pending");
        require(!proposal.approvals[msg.sender], "Already approved");
        
        proposal.approvals[msg.sender] = true;
        proposal.approvalCount++;
        
        emit ProposalApproved(proposalId, msg.sender, proposal.approvalCount);
        
        // Auto-approve if threshold reached
        if (proposal.approvalCount >= threshold) {
            proposal.status = ProposalStatus.APPROVED;
        }
    }
    
    /**
     * @notice Execute an approved proposal
     * @param proposalId The proposal to execute
     */
    function executeProposal(uint256 proposalId) 
        external 
        onlySigner 
        proposalExists(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.status == ProposalStatus.APPROVED, "Proposal not approved");
        require(block.timestamp >= proposal.executionTime, "Timelock not expired");
        
        proposal.status = ProposalStatus.EXECUTED;
        
        // Execute based on proposal type
        if (proposal.proposalType == ProposalType.PARAMETER_CHANGE) {
            _executeParameterChange(proposal.data);
        } else if (proposal.proposalType == ProposalType.EMERGENCY_PAUSE) {
            _executeEmergencyPause();
        } else if (proposal.proposalType == ProposalType.EMERGENCY_UNPAUSE) {
            _executeEmergencyUnpause();
        } else if (proposal.proposalType == ProposalType.ADD_SIGNER) {
            _executeAddSigner(proposal.data);
        } else if (proposal.proposalType == ProposalType.REMOVE_SIGNER) {
            _executeRemoveSigner(proposal.data);
        } else if (proposal.proposalType == ProposalType.CHANGE_THRESHOLD) {
            _executeChangeThreshold(proposal.data);
        }
        
        emit ProposalExecuted(proposalId, msg.sender);
    }
    
    /**
     * @notice Cancel a proposal
     * @param proposalId The proposal to cancel
     */
    function cancelProposal(uint256 proposalId) 
        external 
        onlySigner 
        proposalExists(proposalId) 
    {
        Proposal storage proposal = proposals[proposalId];
        
        require(
            proposal.status == ProposalStatus.PENDING || 
            proposal.status == ProposalStatus.APPROVED,
            "Cannot cancel"
        );
        require(msg.sender == proposal.proposer, "Only proposer can cancel");
        
        proposal.status = ProposalStatus.CANCELLED;
        
        emit ProposalCancelled(proposalId, msg.sender);
    }
    
    /**
     * @notice Emergency pause (bypasses timelock if threshold met)
     */
    function emergencyPause() external onlySigner {
        uint256 proposalId = createProposal(
            ProposalType.EMERGENCY_PAUSE,
            "",
            "Emergency pause"
        );
        
        approveProposal(proposalId);
        
        Proposal storage proposal = proposals[proposalId];
        if (proposal.approvalCount >= threshold) {
            proposal.executionTime = block.timestamp; // Bypass timelock
            executeProposal(proposalId);
        }
    }
    
    /**
     * @notice Execute parameter change
     */
    function _executeParameterChange(bytes memory data) internal {
        // Decode: (paramName, newValue)
        (string memory paramName, uint256 newValue) = abi.decode(data, (string, uint256));
        
        // Call oracle contract to update parameter
        (bool success, ) = oracleContract.call(
            abi.encodeWithSignature("updateParameter(string,uint256)", paramName, newValue)
        );
        
        require(success, "Parameter change failed");
    }
    
    /**
     * @notice Execute emergency pause
     */
    function _executeEmergencyPause() internal {
        paused = true;
        
        // Call oracle contract pause
        (bool success, ) = oracleContract.call(
            abi.encodeWithSignature("pause()")
        );
        
        require(success, "Pause failed");
        
        emit EmergencyPause(msg.sender);
    }
    
    /**
     * @notice Execute emergency unpause
     */
    function _executeEmergencyUnpause() internal {
        paused = false;
        
        // Call oracle contract unpause
        (bool success, ) = oracleContract.call(
            abi.encodeWithSignature("unpause()")
        );
        
        require(success, "Unpause failed");
        
        emit EmergencyUnpause(msg.sender);
    }
    
    /**
     * @notice Execute add signer
     */
    function _executeAddSigner(bytes memory data) internal {
        address newSigner = abi.decode(data, (address));
        
        require(newSigner != address(0), "Invalid signer");
        require(!signers[newSigner], "Already a signer");
        
        signers[newSigner] = true;
        signerList.push(newSigner);
        
        emit SignerAdded(newSigner);
    }
    
    /**
     * @notice Execute remove signer
     */
    function _executeRemoveSigner(bytes memory data) internal {
        address signerToRemove = abi.decode(data, (address));
        
        require(signers[signerToRemove], "Not a signer");
        require(signerList.length - 1 >= threshold, "Would break threshold");
        
        signers[signerToRemove] = false;
        
        // Remove from list
        for (uint256 i = 0; i < signerList.length; i++) {
            if (signerList[i] == signerToRemove) {
                signerList[i] = signerList[signerList.length - 1];
                signerList.pop();
                break;
            }
        }
        
        emit SignerRemoved(signerToRemove);
    }
    
    /**
     * @notice Execute change threshold
     */
    function _executeChangeThreshold(bytes memory data) internal {
        uint256 newThreshold = abi.decode(data, (uint256));
        
        require(newThreshold > 0, "Threshold must be > 0");
        require(newThreshold <= signerList.length, "Threshold too high");
        
        uint256 oldThreshold = threshold;
        threshold = newThreshold;
        
        emit ThresholdChanged(oldThreshold, newThreshold);
    }
    
    /**
     * @notice Get proposal details
     */
    function getProposal(uint256 proposalId) 
        external 
        view 
        proposalExists(proposalId)
        returns (
            ProposalType proposalType,
            address proposer,
            bytes memory data,
            uint256 approvalCount,
            uint256 createdAt,
            uint256 executionTime,
            ProposalStatus status,
            string memory description
        )
    {
        Proposal storage proposal = proposals[proposalId];
        
        return (
            proposal.proposalType,
            proposal.proposer,
            proposal.data,
            proposal.approvalCount,
            proposal.createdAt,
            proposal.executionTime,
            proposal.status,
            proposal.description
        );
    }
    
    /**
     * @notice Check if address has approved proposal
     */
    function hasApproved(uint256 proposalId, address signer) 
        external 
        view 
        proposalExists(proposalId)
        returns (bool) 
    {
        return proposals[proposalId].approvals[signer];
    }
    
    /**
     * @notice Get all signers
     */
    function getSigners() external view returns (address[] memory) {
        return signerList;
    }
    
    /**
     * @notice Get signer count
     */
    function getSignerCount() external view returns (uint256) {
        return signerList.length;
    }
}
