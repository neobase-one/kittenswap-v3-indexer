import { BigDecimal, Bundle, handlerContext } from "generated";

import { exponentToBigDecimal, safeDiv } from "../utils/index";
import { Token } from "generated";
import { ONE_BD, ZERO_BD, ZERO_BI } from "./constants";

const Q192 = BigInt(2) ** BigInt(192);

export function sqrtPriceX96ToTokenPrices(
  sqrtPriceX96: bigint,
  token0: Token,
  token1: Token,
): BigDecimal[] {
  const num = BigDecimal((sqrtPriceX96 * sqrtPriceX96).toString());
  const denom = BigDecimal(Q192.toString());
  const price1 = num
    .div(denom)
    .times(exponentToBigDecimal(token0.decimals))
    .div(exponentToBigDecimal(token1.decimals));

  const price0 = safeDiv(BigDecimal("1"), price1);
  return [price0, price1];
}

export async function getNativePriceInUSD(
  context: handlerContext,
  stablecoinWrappedNativePoolId: string,
  stablecoinIsToken0: boolean
): Promise<BigDecimal> {
  const poolId = `${stablecoinWrappedNativePoolId}`;
  const stablecoinWrappedNativePool = await context.LiquidityPoolAggregator.get(poolId);

  if (stablecoinWrappedNativePool) {
    return stablecoinIsToken0
      ? stablecoinWrappedNativePool.token0Price
      : stablecoinWrappedNativePool.token1Price;
  }
  return ZERO_BD;
}

export async function findNativePerToken(
  token: Token,
  wrappedNativeAddress: string,
  stablecoinAddresses: string[],
  minimumNativeLocked: BigDecimal,
  bundle: Bundle,
  chainId: number,
  context: handlerContext
): Promise<BigDecimal> {
  const tokenAddress = token.id;

  if (tokenAddress == wrappedNativeAddress) {
    return ONE_BD;
  }
  const whiteList = token.whitelistPools;
  // for now just take USD from pool with greatest TVL
  // need to update this to actually detect best rate based on liquidity distribution
  let largestLiquidityETH = ZERO_BD;
  let priceSoFar = ZERO_BD;

  // hardcoded fix for incorrect rates
  // if whitelist includes token - get the safe price
  if (stablecoinAddresses.includes(tokenAddress)) {
    priceSoFar = safeDiv(ONE_BD, bundle.ethPriceUSD);
  } else {
    for (let i = 0; i < whiteList.length; ++i) {
      const poolAddress = whiteList[i];
      const pool = await context.LiquidityPoolAggregator.get(poolAddress);

      if (pool) {
        if (pool.totalLiquidityUSD > ZERO_BI) {
          if (pool.token0_id == token.id) {
            // whitelist token is token1
            const token1 = await context.Token.get(pool.token1_id);
            // get the derived ETH in pool
            if (token1) {
              const ethLocked = pool.totalValueLockedToken1.times(
                token1.derivedETH
              );
              if (
                ethLocked.gt(largestLiquidityETH) &&
                ethLocked.gt(minimumNativeLocked)
              ) {
                largestLiquidityETH = ethLocked;
                // token1 per our token * Eth per token1
                priceSoFar = pool.token1Price.times(
                  token1.derivedETH as BigDecimal
                );
              }
            }
          }
          if (pool.token1_id == token.id) {
            const token0 = await context.Token.get(pool.token0_id);
            // get the derived ETH in pool
            if (token0) {
              const ethLocked = pool.totalValueLockedToken0.times(
                token0.derivedETH
              );
              if (
                ethLocked.gt(largestLiquidityETH) &&
                ethLocked.gt(minimumNativeLocked)
              ) {
                largestLiquidityETH = ethLocked;
                // token0 per our token * ETH per token0
                priceSoFar = pool.token0Price.times(
                  token0.derivedETH as BigDecimal
                );
              }
            }
          }
        }
      }
    }
  }
  return priceSoFar; // nothing was found return 0
}


// /**
//  * Accepts tokens and amounts, return tracked amount based on token whitelist
//  * If one token on whitelist, return amount in that token converted to USD * 2.
//  * If both are, return sum of two amounts
//  * If neither is, return 0
//  */
export async function getTrackedAmountUSD(
  context: handlerContext,
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token,
  chainId: string,
  whitelistTokens: string[]
): Promise<BigDecimal> {
  const bundle = await context.Bundle.get(chainId);
  if (!bundle) return ZERO_BD;

  const price0USD = token0.derivedETH.times(bundle.ethPriceUSD);
  const price1USD = token1.derivedETH.times(bundle.ethPriceUSD);

  // Strip chainId prefix from token ids for whitelist comparison
  const token0Address = token0.id.split("_")[1];
  const token1Address = token1.id.split("_")[1];

  // both are whitelist tokens, return sum of both amounts
  if (
    whitelistTokens.includes(token0Address) &&
    whitelistTokens.includes(token1Address)
  ) {
    return tokenAmount0.times(price0USD).plus(tokenAmount1.times(price1USD));
  }

  // take double value of the whitelisted token amount
  if (
    whitelistTokens.includes(token0Address) &&
    !whitelistTokens.includes(token1Address)
  ) {
    return tokenAmount0.times(price0USD).times(new BigDecimal("2"));
  }

  // take double value of the whitelisted token amount
  if (
    !whitelistTokens.includes(token0Address) &&
    whitelistTokens.includes(token1Address)
  ) {
    return tokenAmount1.times(price1USD).times(new BigDecimal("2"));
  }

  // neither token is on white list, tracked amount is 0
  return ZERO_BD;
}

export function calculateAmountUSD(
  amount0: BigDecimal,
  amount1: BigDecimal,
  token0DerivedETH: BigDecimal,
  token1DerivedETH: BigDecimal,
  ethPriceUSD: BigDecimal
): BigDecimal {
  return amount0
    .times(token0DerivedETH.times(ethPriceUSD))
    .plus(amount1.times(token1DerivedETH.times(ethPriceUSD)));
}
