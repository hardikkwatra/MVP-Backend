const { fetchBlockchainData } = require("../services/moralisService");

exports.getWalletDetails = async (address) => { // ✅ Accept `address` directly
    try {
        if (!address) {
            throw new Error("Wallet address is required");
        }

        const data = await fetchBlockchainData(address);
        return data;
    } catch (error) {
        console.error("Error in getWalletDetails:", error);
        throw new Error(error.message); // ✅ Throw error instead of sending response
    }
};
