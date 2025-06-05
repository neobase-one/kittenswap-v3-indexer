import {
  Factory,
  LiquidityPoolAggregator,
  handlerContext
} from "../src/Types.gen";
import { ZERO_BN, ADDRESS_ZERO } from "../Constants";

/**
 * Gets or creates a Factory entity for a given factory address.
 * If the factory doesn't exist, creates a new one with default values.
 * 
 * @param factoryAddress - The address of the factory contract
 * @param context - The handler context for database operations
 * @returns Promise<Factory> - The factory entity
 */
export async function getOrCreateFactory(
  factoryAddress: string,
  context: handlerContext
): Promise<Factory> {
  let factory = await context.Factory.get(factoryAddress);
  
  if (!factory) {
    factory = {
      id: factoryAddress,
      poolCount: 0n,
      txCount: 0n,
      totalVolumeUSD: ZERO_BN,
      totalVolumeETH: ZERO_BN,
      totalFeesUSD: ZERO_BN,
      totalFeesETH: ZERO_BN,
      untrackedVolumeUSD: ZERO_BN,
      totalValueLockedUSD: ZERO_BN,
      totalValueLockedETH: ZERO_BN,
      totalValueLockedUSDUntracked: ZERO_BN,
      totalValueLockedETHUntracked: ZERO_BN,
      owner: ADDRESS_ZERO,
    };
    
    context.Factory.set(factory);
  }
  
  return factory;
}

/**
 * Updates factory metrics when a new pool is created.
 * Increments poolCount and txCount.
 * 
 * @param factoryAddress - The address of the factory contract
 * @param context - The handler context for database operations
 */
export async function updateFactoryOnPoolCreated(
  factoryAddress: string,
  context: handlerContext
): Promise<void> {
  const factory = await getOrCreateFactory(factoryAddress, context);
  
  const updatedFactory: Factory = {
    ...factory,
    poolCount: factory.poolCount + 1n,
    txCount: factory.txCount + 1n,
  };
  
  context.Factory.set(updatedFactory);
}

/**
 * Updates factory metrics when a swap occurs.
 * Updates volume, fees, TVL, and transaction counts.
 * 
 * @param factoryAddress - The address of the factory contract
 * @param volumeUSD - Volume in USD from the swap
 * @param volumeETH - Volume in ETH from the swap
 * @param feesUSD - Fees in USD from the swap
 * @param feesETH - Fees in ETH from the swap
 * @param untrackedVolumeUSD - Untracked volume in USD
 * @param tvlUSD - Updated total value locked in USD
 * @param tvlETH - Updated total value locked in ETH
 * @param tvlUSDUntracked - Updated untracked TVL in USD
 * @param tvlETHUntracked - Updated untracked TVL in ETH
 * @param context - The handler context for database operations
 */
export async function updateFactoryOnSwap(
  factoryAddress: string,
  volumeUSD: bigint,
  volumeETH: bigint,
  feesUSD: bigint,
  feesETH: bigint,
  untrackedVolumeUSD: bigint,
  tvlUSD: bigint,
  tvlETH: bigint,
  tvlUSDUntracked: bigint,
  tvlETHUntracked: bigint,
  context: handlerContext
): Promise<void> {
  const factory = await getOrCreateFactory(factoryAddress, context);
  
//   const updatedFactory: Factory = {
//     ...factory,
//     txCount: factory.txCount + 1n,
//     totalVolumeUSD: factory.totalVolumeUSD.plus(volumeUSD),
//     totalVolumeETH: factory.totalVolumeETH.plus(volumeETH),
//     totalFeesUSD: factory.totalFeesUSD.plus(feesUSD),
//     totalFeesETH: factory.totalFeesETH.plus(feesETH),
//     untrackedVolumeUSD: factory.untrackedVolumeUSD + untrackedVolumeUSD,
//     totalValueLockedUSD: tvlUSD,
//     totalValueLockedETH: tvlETH,
//     totalValueLockedUSDUntracked: tvlUSDUntracked,
//     totalValueLockedETHUntracked: tvlETHUntracked,
//   };
  
//   context.Factory.set(updatedFactory);
}

// /**
//  * Updates factory metrics when liquidity is added or removed.
//  * Updates TVL metrics and transaction counts.
//  * 
//  * @param factoryAddress - The address of the factory contract
//  * @param tvlUSDDelta - Change in TVL in USD (can be negative for removes)
//  * @param tvlETHDelta - Change in TVL in ETH (can be negative for removes)
//  * @param tvlUSDUntrackedDelta - Change in untracked TVL in USD
//  * @param tvlETHUntrackedDelta - Change in untracked TVL in ETH
//  * @param context - The handler context for database operations
//  */
// export async function updateFactoryOnLiquidityChange(
//   factoryAddress: string,
//   tvlUSDDelta: bigint,
//   tvlETHDelta: bigint,
//   tvlUSDUntrackedDelta: bigint,
//   tvlETHUntrackedDelta: bigint,
//   context: handlerContext
// ): Promise<void> {
//   const factory = await getOrCreateFactory(factoryAddress, context);
  
//   const updatedFactory: Factory = {
//     ...factory,
//     txCount: factory.txCount + 1n,
//     totalValueLockedUSD: factory.totalValueLockedUSD + tvlUSDDelta,
//     totalValueLockedETH: factory.totalValueLockedETH + tvlETHDelta,
//     totalValueLockedUSDUntracked: factory.totalValueLockedUSDUntracked + tvlUSDUntrackedDelta,
//     totalValueLockedETHUntracked: factory.totalValueLockedETHUntracked + tvlETHUntrackedDelta,
//   };
  
//   context.Factory.set(updatedFactory);
// }

// /**
//  * Updates factory metrics when fees are collected.
//  * Updates fee totals and transaction counts.
//  * 
//  * @param factoryAddress - The address of the factory contract
//  * @param feesUSD - Fees collected in USD
//  * @param feesETH - Fees collected in ETH
//  * @param context - The handler context for database operations
//  */
// export async function updateFactoryOnFeesCollected(
//   factoryAddress: string,
//   feesUSD: bigint,
//   feesETH: bigint,
//   context: handlerContext
// ): Promise<void> {
//   const factory = await getOrCreateFactory(factoryAddress, context);
  
//   const updatedFactory: Factory = {
//     ...factory,
//     txCount: factory.txCount + 1n,
//     totalFeesUSD: factory.totalFeesUSD + feesUSD,
//     totalFeesETH: factory.totalFeesETH + feesETH,
//   };
  
//   context.Factory.set(updatedFactory);
// }

// /**
//  * Calculates the total TVL across all pools for a factory.
//  * This is used to keep factory TVL metrics accurate.
//  * 
//  * @param factoryAddress - The address of the factory contract
//  * @param context - The handler context for database operations
//  * @returns Promise<{tvlUSD: bigint, tvlETH: bigint, tvlUSDUntracked: bigint, tvlETHUntracked: bigint}>
//  */
// export async function calculateFactoryTVL(
//   factoryAddress: string,
//   context: handlerContext
// ): Promise<{
//   tvlUSD: bigint;
//   tvlETH: bigint;
//   tvlUSDUntracked: bigint;
//   tvlETHUntracked: bigint;
// }> {
//   // Get all pools created by this factory
//   const poolCreatedEvents = await context.CLFactory_PoolCreated.getWhere.poolFactory.eq(factoryAddress);
//   const poolFactoryEvents = await context.PoolFactory_PoolCreated.getWhere.poolFactory.eq(factoryAddress);
  
//   let totalTVLUSD = 0n;
//   let totalTVLETH = 0n;
//   let totalTVLUSDUntracked = 0n;
//   let totalTVLETHUntracked = 0n;
  
//   // Sum TVL from CL pools
//   for (const poolEvent of poolCreatedEvents) {
//     const pool = await context.LiquidityPoolAggregator.get(poolEvent.pool);
//     if (pool) {
//       totalTVLUSD += pool.totalLiquidityUSD;
//       totalTVLETH += pool.totalValueLockedETH;
//       totalTVLUSDUntracked += pool.totalValueLockedUSDUntracked;
//       totalTVLETHUntracked += pool.totalValueLockedETHUntracked;
//     }
//   }
  
//   // Sum TVL from regular pools
//   for (const poolEvent of poolFactoryEvents) {
//     const pool = await context.LiquidityPoolAggregator.get(poolEvent.pool);
//     if (pool) {
//       totalTVLUSD += pool.totalLiquidityUSD;
//       totalTVLETH += pool.totalValueLockedETH;
//       totalTVLUSDUntracked += pool.totalValueLockedUSDUntracked;
//       totalTVLETHUntracked += pool.totalValueLockedETHUntracked;
//     }
//   }
  
//   return {
//     tvlUSD: totalTVLUSD,
//     tvlETH: totalTVLETH,
//     tvlUSDUntracked: totalTVLUSDUntracked,
//     tvlETHUntracked: totalTVLETHUntracked,
//   };
// }

// /**
//  * Gets the factory address for a given pool address.
//  * Searches through both CL and regular pool creation events.
//  * 
//  * @param poolAddress - The address of the pool
//  * @param context - The handler context for database operations
//  * @returns Promise<string | null> - The factory address or null if not found
//  */
// export async function getFactoryAddressForPool(
//   poolAddress: string,
//   context: handlerContext
// ): Promise<string | null> {
//   // Check CL factory events first
//   const clEvents = await context.CLFactory_PoolCreated.getWhere.pool.eq(poolAddress);
//   if (clEvents.length > 0) {
//     return clEvents[0].poolFactory;
//   }
  
//   // Check regular factory events
//   const poolEvents = await context.PoolFactory_PoolCreated.getWhere.pool.eq(poolAddress);
//   if (poolEvents.length > 0) {
//     return poolEvents[0].poolFactory;
//   }
  
//   return null;
// } 