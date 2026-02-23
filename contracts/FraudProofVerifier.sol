// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FraudProofVerifier
 * @notice Verifies fraud proofs for disputed AI inferences
 * @dev Implements multiple verification methods for production use
 * 
 * Verification Methods:
 * 1. Deterministic Re-execution (for simple models)
 * 2. Merkle Proof Verification (for large outputs)
 * 3. zkSNARK Verification (for privacy-preserving proofs)
 * 4. Interactive Verification Game (for complex disputes)
 */
contract FraudProofVerifier {
    
    // Verification method types
    enum VerificationMethod {
        DETERMINISTIC,      // Re-execute and compare
        MERKLE_PROOF,       // Verify output chunks
        ZKSNARK,            // Zero-knowledge proof
        INTERACTIVE_GAME    // Multi-round verification
    }
    
    // Verification result
    struct VerificationResult {
        bool isValid;
        bool inferenceCorrect;
        address winner;
        string reason;
        uint256 timestamp;
    }
    
    // Interactive game state
    struct InteractiveGame {
        uint256 requestId;
        address prover;
        address challenger;
        uint256 currentRound;
        uint256 maxRounds;
        bytes32[] commitments;
        bool isActive;
        uint256 deadline;
    }
    
    // Events
    event VerificationStarted(uint256 indexed requestId, VerificationMethod method);
    event VerificationCompleted(uint256 indexed requestId, bool inferenceCorrect, address winner);
    event InteractiveGameStarted(uint256 indexed requestId, address prover, address challenger);
    event InteractiveGameRound(uint256 indexed requestId, uint256 round, bytes32 commitment);
    event InteractiveGameCompleted(uint256 indexed requestId, address winner);
    
    // State
    mapping(uint256 => VerificationResult) public verificationResults;
    mapping(uint256 => InteractiveGame) public interactiveGames;
    mapping(bytes32 => bool) public trustedModels; // Whitelisted deterministic models
    
    // Constants
    uint256 public constant MAX_INTERACTIVE_ROUNDS = 10;
    uint256 public constant ROUND_TIMEOUT = 1 hours;
    
    /**
     * @notice Verify a fraud proof using the appropriate method
     * @param requestId The request ID being disputed
     * @param modelHash Hash of the AI model used
     * @param inputData Original input data
     * @param claimedOutput Output claimed by prover
     * @param counterProof Counter-proof provided by challenger
     * @param method Verification method to use
     * @return result Verification result
     */
    function verifyFraudProof(
        uint256 requestId,
        bytes32 modelHash,
        bytes memory inputData,
        bytes memory claimedOutput,
        bytes memory counterProof,
        VerificationMethod method
    ) external returns (VerificationResult memory result) {
        emit VerificationStarted(requestId, method);
        
        if (method == VerificationMethod.DETERMINISTIC) {
            result = _verifyDeterministic(requestId, modelHash, inputData, claimedOutput, counterProof);
        } else if (method == VerificationMethod.MERKLE_PROOF) {
            result = _verifyMerkleProof(requestId, claimedOutput, counterProof);
        } else if (method == VerificationMethod.ZKSNARK) {
            result = _verifyZkSnark(requestId, modelHash, inputData, claimedOutput, counterProof);
        } else if (method == VerificationMethod.INTERACTIVE_GAME) {
            result = _startInteractiveGame(requestId, msg.sender, claimedOutput, counterProof);
        }
        
        verificationResults[requestId] = result;
        emit VerificationCompleted(requestId, result.inferenceCorrect, result.winner);
        
        return result;
    }
    
    /**
     * @notice Verify using deterministic re-execution
     * @dev Only works for whitelisted deterministic models
     */
    function _verifyDeterministic(
        uint256 requestId,
        bytes32 modelHash,
        bytes memory inputData,
        bytes memory claimedOutput,
        bytes memory counterProof
    ) internal view returns (VerificationResult memory) {
        // Check if model is whitelisted as deterministic
        if (!trustedModels[modelHash]) {
            return VerificationResult({
                isValid: false,
                inferenceCorrect: false,
                winner: address(0),
                reason: "Model not whitelisted for deterministic verification",
                timestamp: block.timestamp
            });
        }
        
        // In production, this would call an off-chain oracle or TEE
        // For now, we compare hashes
        bytes32 claimedHash = keccak256(claimedOutput);
        bytes32 counterHash = keccak256(counterProof);
        
        bool inferenceCorrect = claimedHash == counterHash;
        
        return VerificationResult({
            isValid: true,
            inferenceCorrect: inferenceCorrect,
            winner: inferenceCorrect ? address(0) : msg.sender, // 0 = prover, msg.sender = challenger
            reason: inferenceCorrect ? "Outputs match" : "Outputs differ",
            timestamp: block.timestamp
        });
    }
    
    /**
     * @notice Verify using Merkle proof for large outputs
     * @dev Challenger provides proof that a chunk of output is incorrect
     */
    function _verifyMerkleProof(
        uint256 requestId,
        bytes memory claimedOutput,
        bytes memory counterProof
    ) internal pure returns (VerificationResult memory) {
        // Decode counter proof: [merkleRoot, proof[], chunkIndex, correctChunk]
        (bytes32 merkleRoot, bytes32[] memory proof, uint256 chunkIndex, bytes memory correctChunk) = 
            abi.decode(counterProof, (bytes32, bytes32[], uint256, bytes));
        
        // Verify the Merkle proof
        bytes32 leaf = keccak256(abi.encodePacked(chunkIndex, correctChunk));
        bool proofValid = _verifyMerkleProofInternal(proof, merkleRoot, leaf);
        
        if (!proofValid) {
            return VerificationResult({
                isValid: false,
                inferenceCorrect: true, // Challenger's proof invalid, prover wins
                winner: address(0),
                reason: "Invalid Merkle proof",
                timestamp: block.timestamp
            });
        }
        
        // Extract the claimed chunk from output
        bytes memory claimedChunk = _extractChunk(claimedOutput, chunkIndex);
        
        // Compare chunks
        bool chunksMatch = keccak256(claimedChunk) == keccak256(correctChunk);
        
        return VerificationResult({
            isValid: true,
            inferenceCorrect: chunksMatch,
            winner: chunksMatch ? address(0) : msg.sender,
            reason: chunksMatch ? "Chunks match" : "Chunk mismatch found",
            timestamp: block.timestamp
        });
    }
    
    /**
     * @notice Verify using zkSNARK proof
     * @dev Requires a zkSNARK verifier contract
     */
    function _verifyZkSnark(
        uint256 requestId,
        bytes32 modelHash,
        bytes memory inputData,
        bytes memory claimedOutput,
        bytes memory counterProof
    ) internal pure returns (VerificationResult memory) {
        // In production, this would call a zkSNARK verifier contract
        // For now, we return a placeholder
        
        // Decode proof: [proof, publicInputs]
        // (bytes memory proof, uint256[] memory publicInputs) = 
        //     abi.decode(counterProof, (bytes, uint256[]));
        
        // bool proofValid = zkVerifier.verify(proof, publicInputs);
        
        return VerificationResult({
            isValid: true,
            inferenceCorrect: true, // Placeholder
            winner: address(0),
            reason: "zkSNARK verification (placeholder)",
            timestamp: block.timestamp
        });
    }
    
    /**
     * @notice Start an interactive verification game
     * @dev Multi-round bisection protocol
     */
    function _startInteractiveGame(
        uint256 requestId,
        address challenger,
        bytes memory claimedOutput,
        bytes memory counterProof
    ) internal returns (VerificationResult memory) {
        // Initialize game
        interactiveGames[requestId] = InteractiveGame({
            requestId: requestId,
            prover: address(0), // Set by oracle contract
            challenger: challenger,
            currentRound: 0,
            maxRounds: MAX_INTERACTIVE_ROUNDS,
            commitments: new bytes32[](0),
            isActive: true,
            deadline: block.timestamp + ROUND_TIMEOUT
        });
        
        emit InteractiveGameStarted(requestId, address(0), challenger);
        
        return VerificationResult({
            isValid: false, // Game in progress
            inferenceCorrect: false,
            winner: address(0),
            reason: "Interactive game started",
            timestamp: block.timestamp
        });
    }
    
    /**
     * @notice Submit a round in the interactive game
     * @param requestId The request ID
     * @param commitment Commitment for this round
     */
    function submitInteractiveRound(
        uint256 requestId,
        bytes32 commitment
    ) external {
        InteractiveGame storage game = interactiveGames[requestId];
        
        require(game.isActive, "Game not active");
        require(block.timestamp <= game.deadline, "Round timeout");
        require(
            msg.sender == game.prover || msg.sender == game.challenger,
            "Not a participant"
        );
        
        game.commitments.push(commitment);
        game.currentRound++;
        game.deadline = block.timestamp + ROUND_TIMEOUT;
        
        emit InteractiveGameRound(requestId, game.currentRound, commitment);
        
        // Check if game should end
        if (game.currentRound >= game.maxRounds) {
            _finalizeInteractiveGame(requestId);
        }
    }
    
    /**
     * @notice Finalize the interactive game
     */
    function _finalizeInteractiveGame(uint256 requestId) internal {
        InteractiveGame storage game = interactiveGames[requestId];
        
        // Determine winner based on commitments
        // In production, this would involve more complex logic
        address winner = game.prover; // Placeholder
        
        game.isActive = false;
        
        verificationResults[requestId] = VerificationResult({
            isValid: true,
            inferenceCorrect: winner == game.prover,
            winner: winner,
            reason: "Interactive game completed",
            timestamp: block.timestamp
        });
        
        emit InteractiveGameCompleted(requestId, winner);
    }
    
    /**
     * @notice Claim timeout in interactive game
     */
    function claimInteractiveTimeout(uint256 requestId) external {
        InteractiveGame storage game = interactiveGames[requestId];
        
        require(game.isActive, "Game not active");
        require(block.timestamp > game.deadline, "Not timed out");
        
        // Timeout favors the waiting party
        address winner = msg.sender == game.prover ? game.prover : game.challenger;
        
        game.isActive = false;
        
        verificationResults[requestId] = VerificationResult({
            isValid: true,
            inferenceCorrect: winner == game.prover,
            winner: winner,
            reason: "Timeout claimed",
            timestamp: block.timestamp
        });
        
        emit InteractiveGameCompleted(requestId, winner);
    }
    
    /**
     * @notice Add a trusted deterministic model
     */
    function addTrustedModel(bytes32 modelHash) external {
        trustedModels[modelHash] = true;
    }
    
    /**
     * @notice Remove a trusted model
     */
    function removeTrustedModel(bytes32 modelHash) external {
        trustedModels[modelHash] = false;
    }
    
    /**
     * @notice Verify Merkle proof internally
     */
    function _verifyMerkleProofInternal(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        
        return computedHash == root;
    }
    
    /**
     * @notice Extract a chunk from output data
     */
    function _extractChunk(
        bytes memory data,
        uint256 chunkIndex
    ) internal pure returns (bytes memory) {
        uint256 chunkSize = 32; // 32 bytes per chunk
        uint256 start = chunkIndex * chunkSize;
        
        require(start < data.length, "Chunk index out of bounds");
        
        uint256 end = start + chunkSize;
        if (end > data.length) {
            end = data.length;
        }
        
        bytes memory chunk = new bytes(end - start);
        for (uint256 i = 0; i < chunk.length; i++) {
            chunk[i] = data[start + i];
        }
        
        return chunk;
    }
    
    /**
     * @notice Get verification result
     */
    function getVerificationResult(uint256 requestId) 
        external 
        view 
        returns (VerificationResult memory) 
    {
        return verificationResults[requestId];
    }
    
    /**
     * @notice Get interactive game state
     */
    function getInteractiveGame(uint256 requestId) 
        external 
        view 
        returns (InteractiveGame memory) 
    {
        return interactiveGames[requestId];
    }
}
