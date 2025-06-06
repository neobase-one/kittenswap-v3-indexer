import {
  CHAIN_CONSTANTS,
  TokenIdByChain,
  toChecksumAddress,
  ZERO_BI,
  ZERO_BD,
} from "./Constants";
import { Token } from "./src/Types.gen";
import { getErc20TokenDetails } from "./Erc20";
import PriceOracleABI from "../abis/VeloPriceOracleABI.json";
import SpotPriceAggregatorABI from "../abis/SpotPriceAggregator.json";
import { PriceOracleType } from "./Constants";
import { BigDecimal } from "generated";
export interface TokenPriceData {
  pricePerUSDNew: BigDecimal;
  decimals: bigint;
}

export async function createTokenEntity(
  tokenAddress: string,
  chainId: number,
  blockNumber: number,
  context: any
) {
  const blockDatetime = new Date(blockNumber * 1000);
  const tokenDetails = await getErc20TokenDetails(tokenAddress, chainId);

  const tokenEntity: Token = {
    id: TokenIdByChain(tokenAddress, chainId),
    address: toChecksumAddress(tokenAddress),
    symbol: tokenDetails.symbol,
    name: tokenDetails.symbol, // Using symbol as name, update if you have a separate name field
    chainId: chainId,
    decimals: BigInt(tokenDetails.decimals),
    pricePerUSDNew: ZERO_BI,
    lastUpdatedTimestamp: blockDatetime,
    isWhitelisted: false,

    // Total supply - ensure it's always a valid string
    totalSupply: BigInt(tokenDetails.totalSupply || 0n),
    // Volume metrics
    volume: 0n,
    volumeUSD: 0n,
    untrackedVolumeUSD: 0n,
    feesUSD: 0n,
    // Transaction counts
    txCount: 0n,
    buyCount: 0n,
    sellCount: 0n,
    // Pool participation
    poolCount: 0n,
    // Liquidity metrics
    totalValueLocked: 0n,
    totalValueLockedUSD: 0n,
    totalValueLockedUSDUntracked: 0n,
    derivedETH: ZERO_BD,
    whitelistPools: [],
    // Archive helpers for minute data
    lastOneMinuteArchived: 0n,
    lastFiveMinuteArchived: 0n,
    oneMinuteArray: [],
    fiveMinuteArray: [],
    lastOneMinuteRecorded: 0n,
    lastFiveMinuteRecorded: 0n,
  };

  context.Token.set(tokenEntity);
  return tokenEntity;
}

const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Refreshes a token's price data if the update interval has passed.
 *
 * This function checks if enough time has passed since the last update (1 hour),
 * and if so, fetches new price data for the token. The token entity is updated
 * in the database with the new price and timestamp.
 *
 * @param {Token} token - The token entity to refresh
 * @param {number} blockNumber - The block number to fetch price data from
 * @param {number} blockTimestamp - The timestamp of the block in seconds
 * @param {number} chainId - The chain ID where the token exists
 * @param {any} context - The database context for updating entities
 * @returns {Promise<Token>} The updated token entity
 */
export async function refreshTokenPrice(
  token: Token,
  blockNumber: number,
  blockTimestamp: number,
  chainId: number,
  context: any
): Promise<Token> {
  const blockTimestampMs = blockTimestamp * 1000;

  if (blockTimestampMs - token.lastUpdatedTimestamp.getTime() < ONE_HOUR_MS) {
    return token;
  }

  const tokenPriceData = await getTokenPriceData(
    token.address,
    blockNumber,
    chainId
  );
  const currentPrice = tokenPriceData.pricePerUSDNew;
  const updatedToken: Token = {
    ...token,
    pricePerUSDNew: toBigInt(currentPrice),
    decimals: tokenPriceData.decimals,
    lastUpdatedTimestamp: new Date(blockTimestampMs),
  };
  context.Token.set(updatedToken);

  // // Create new TokenPrice entity
  // const tokenPrice: TokenPriceSnapshot = {
  //   id: TokenIdByBlock(token.address, chainId, blockNumber),
  //   address: toChecksumAddress(token.address),
  //   pricePerUSDNew: currentPrice,
  //   chainId: chainId,
  //   isWhitelisted: token.isWhitelisted,
  //   lastUpdatedTimestamp: new Date(blockTimestampMs),
  // };

  // context.TokenPriceSnapshot.set(tokenPrice);
  return updatedToken;
}

/**
 * Fetches current price data for a specific token.
 *
 * Retrieves the token's price and decimals by:
 * 1. Getting token details from the contract
 * 2. Fetching price data from the price oracle
 * 3. Converting the price to the appropriate format
 *
 * @param {string} tokenAddress - The token's contract address
 * @param {number} blockNumber - The block number to fetch price data from
 * @param {number} chainId - The chain ID where the token exists
 * @returns {Promise<TokenPriceData>} Object containing the token's price and decimals
 * @throws {Error} If there's an error fetching the token price
 */
export async function getTokenPriceData(
  tokenAddress: string,
  blockNumber: number,
  chainId: number
): Promise<TokenPriceData> {

  return { pricePerUSDNew: ZERO_BD, decimals: 0n };
}

/**
 * Reads the prices of specified tokens from a price oracle contract.
 *
 * This function interacts with a blockchain price oracle to fetch the current
 * prices of a list of token addresses. It returns them as an array of strings.
 *
 * @note: See https://github.com/ethzoomer/optimism-prices for underlying smart contract
 * implementation.
 *
 * @param {string[]} addrs - An array of token addresses for which to fetch prices.
 * @param {number} chainId - The ID of the blockchain network where the price oracle
 *                           contract is deployed.
 * @param {number} blockNumber - The block number to fetch prices for.
 * @returns {Promise<string[]>} A promise that resolves to an array of token prices
 *                              as strings.
 *
 * @throws {Error} Throws an error if the price fetching process fails or if there
 *                 is an issue with the contract call.
 */
export async function read_prices(
  tokenAddress: string,
  usdcAddress: string,
  systemTokenAddress: string,
  wethAddress: string,
  connectors: string[],
  chainId: number,
  blockNumber: number
): Promise<{ pricePerUSDNew: bigint; priceOracleType: PriceOracleType }> {
  const ethClient = CHAIN_CONSTANTS[chainId].eth_client;
  const priceOracleType = CHAIN_CONSTANTS[chainId].oracle.getType(blockNumber);
  const priceOracleAddress =
    CHAIN_CONSTANTS[chainId].oracle.getAddress(priceOracleType);

  if (priceOracleType === PriceOracleType.V3) {
    const tokenAddressArray = [
      ...connectors,
      systemTokenAddress,
      wethAddress,
      usdcAddress,
    ];
    const args = [[tokenAddress], usdcAddress, false, tokenAddressArray, 10];
    const { result } = await ethClient.simulateContract({
      address: priceOracleAddress as `0x${string}`,
      abi: SpotPriceAggregatorABI,
      functionName: "getManyRatesWithCustomConnectors",
      args,
      blockNumber: BigInt(blockNumber),
    });
    return { pricePerUSDNew: BigInt(result[0]), priceOracleType };
  } else {
    const tokenAddressArray = [
      tokenAddress,
      ...connectors,
      systemTokenAddress,
      wethAddress,
      usdcAddress,
    ];
    const args = [1, tokenAddressArray];
    const { result } = await ethClient.simulateContract({
      address: priceOracleAddress as `0x${string}`,
      abi: PriceOracleABI,
      functionName: "getManyRatesWithConnectors",
      args,
      blockNumber: BigInt(blockNumber),
    });
    return { pricePerUSDNew: BigInt(result[0]), priceOracleType };
  }
}


// export async function getPriceOfETHInUSD(chainId: number, context: handlerContext, decimals: bigint): Promise<TokenPriceData> {
//   const REFERENCE_TOKEN = CHAIN_CONSTANTS[chainId].weth;
//   const STABLE_POOL = CHAIN_CONSTANTS[chainId].stablePool;

//   const usdcPool = await context.LiquidityPoolAggregator.get(STABLE_POOL!)
//   if (usdcPool) {
//     if (usdcPool.token0_id == toChecksumAddress(REFERENCE_TOKEN)) return {
//       pricePerUSDNew: usdcPool.token1Price,
//       decimals
//     }
//     else return {
//       pricePerUSDNew: usdcPool.token0Price,
//       decimals
//     }
//   } else {
//     return {
//       pricePerUSDNew: ZERO_BI,
//       decimals
//     }
//   }
// }

// export async function getPriceOfTokenInETH(tokenAddress: string, chainId: number, context: handlerContext, decimals: bigint): Promise<TokenPriceData> {

// }

export function toBigInt(value: BigDecimal, decimals: number = 18): bigint {
  try {
    // Parse the string representation of the BigDecimal
    const valueStr = value.toString();
    // Remove any decimal points and convert to bigint
    const valueWithoutDecimal = valueStr.replace('.', '');
    // Add necessary padding based on decimals
    return BigInt(valueWithoutDecimal.padEnd(valueWithoutDecimal.length + decimals, '0'));
  } catch (e) {
    console.error("Error converting BigDecimal to bigint:", e);
    return 0n;
  }
}

export function toDecimal(value: bigint, decimals: number = 18): BigDecimal {
  let precision = new BigDecimal("1" + "0".repeat(decimals));
  return new BigDecimal(value.toString()).div(precision);
}
