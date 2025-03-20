const Moralis = require("moralis").default;
const { EvmChain } = require("@moralisweb3/common-evm-utils");

const fetchBlockchainData = async (address) => {
  try {
    // Fetch data asynchronously using Promise.all()
    const [
      nativeBalance,
      tokenBalances,
      activeChains,
      defiPositionsSummary,
      resolvedAddress,
      walletNFTs,
    ] = await Promise.all([
      Moralis.EvmApi.balance.getNativeBalance({ chain: EvmChain.ETHEREUM, address }),
      Moralis.EvmApi.token.getWalletTokenBalances({ chain: EvmChain.ETHEREUM, address }),
      Moralis.EvmApi.wallets.getWalletActiveChains({ address }),
      Moralis.EvmApi.wallets.getDefiPositionsSummary({ chain: "0x1", address }),
      Moralis.EvmApi.resolve.resolveAddress({ address }),
      Moralis.EvmApi.nft.getWalletNFTs({ chain: "0x1", address, format: "decimal", mediaItems: false }),
    ]);

    return {
      address,
      nativeBalance: nativeBalance?.result?.balance?.ether || null,
      tokenBalances: tokenBalances?.result?.map((token) => token.display()) || [],
      activeChains: activeChains?.result || [],
      defiPositionsSummary: defiPositionsSummary?.result || {},
      resolvedAddress: resolvedAddress?.result || null,
      walletNFTs: walletNFTs?.result || [],
    };
  } catch (error) {
    console.error(" Error fetching blockchain data:", error);
    throw new Error("Failed to fetch blockchain data.");
  }
};

module.exports = { fetchBlockchainData };
