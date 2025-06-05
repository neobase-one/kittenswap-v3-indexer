import {
  CLFactory,
  CLFactory_PoolCreated,
  LiquidityPoolAggregator,
  Token,
  Bundle,
} from "generated";
import { updateLiquidityPoolAggregator } from "../Aggregators/LiquidityPoolAggregator";
import { TokenEntityMapping } from "../CustomTypes";
import { TokenIdByChain, ZERO_BD } from "../Constants";
import { generatePoolName } from "../Helpers";
import { createTokenEntity, getPriceOfETHInUSD } from "../PriceOracle";
import { ZERO_BN } from "../Constants";
import { updateFactoryOnPoolCreated } from "../Factories/FactoryManager";

CLFactory.PoolCreated.contractRegister(({ event, context }) => {
  context.addCLPool(event.params.pool);
});

CLFactory.PoolCreated.handlerWithLoader({
  loader: async ({ event, context }) => {
    const [poolToken0, poolToken1] = await Promise.all([
      context.Token.get(TokenIdByChain(event.params.token0, event.chainId)),
      context.Token.get(TokenIdByChain(event.params.token1, event.chainId)),
    ]);

    return { poolToken0, poolToken1 };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const entity: CLFactory_PoolCreated = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      poolFactory: event.srcAddress,
      token0: TokenIdByChain(event.params.token0, event.chainId),
      token1: TokenIdByChain(event.params.token1, event.chainId),
      tickSpacing: event.params.tickSpacing,
      pool: event.params.pool,
      timestamp: new Date(event.block.timestamp * 1000),
      blockNumber: event.block.number,
      logIndex: event.logIndex,
      chainId: event.chainId,
      transactionHash: event.transaction.hash,
    };

    context.CLFactory_PoolCreated.set(entity);

    const { poolToken0, poolToken1 } = loaderReturn;
    let poolTokenSymbols: string[] = [];
    let poolTokenAddressMappings: TokenEntityMapping[] = [
      { address: event.params.token0, tokenInstance: poolToken0 },
      { address: event.params.token1, tokenInstance: poolToken1 },
    ];

    for (let poolTokenAddressMapping of poolTokenAddressMappings) {
      if (poolTokenAddressMapping.tokenInstance == undefined) {
        try {
          poolTokenAddressMapping.tokenInstance = await createTokenEntity(
            poolTokenAddressMapping.address,
            event.chainId,
            event.block.number,
            context
          );
          poolTokenSymbols.push(poolTokenAddressMapping.tokenInstance.symbol);
        } catch (error) {
          context.log.error(
            `Error in cl factory fetching token details` +
              ` for ${poolTokenAddressMapping.address} on chain ${event.chainId}: ${error}`
          );
        }
      } else {
        poolTokenSymbols.push(poolTokenAddressMapping.tokenInstance.symbol);
      }
    }

    const ethPrice = await getPriceOfETHInUSD(event.chainId, context, BigInt(18));
    const bundle: Bundle = {
      id: event.chainId.toString(),
      ethPriceUSD: ethPrice.pricePerUSDNew,
    };
    context.Bundle.set(bundle);

    const token0Id = TokenIdByChain(event.params.token0, event.chainId);
    const token1Id = TokenIdByChain(event.params.token1, event.chainId);

    const aggregator: LiquidityPoolAggregator = {
      id: event.params.pool,
      chainId: event.chainId,
      name: generatePoolName(
        poolTokenSymbols[0],
        poolTokenSymbols[1],
        false, // Pool is not stable
        Number(event.params.tickSpacing) // Pool is CL
      ),
      token0_id: token0Id,
      token1_id: token1Id,
      createdAtTimestamp: BigInt(event.block.timestamp),
      createdAtBlockNumber: BigInt(event.block.number),
      feeTier: BigInt(event.params.tickSpacing),
      sqrtPrice: 0n,
      tick: 0n,
      isStable: false,
      isCL: true,
      reserve0: 0n,
      reserve1: 0n,
      totalLiquidityUSD: 0n,
      totalVolume0: 0n,
      totalVolume1: 0n,
      totalVolumeUSD: 0n,
      totalVolumeUSDWhitelisted: 0n,
      totalFees0: 0n,
      totalFees1: 0n,
      gaugeFees0CurrentEpoch: 0n,
      gaugeFees1CurrentEpoch: 0n,
      totalFeesUSD: 0n,
      totalFeesUSDWhitelisted: 0n,
      numberOfSwaps: 0n,
      token0Price: 0n,
      token1Price: 0n,
      totalVotesDeposited: 0n,
      totalVotesDepositedUSD: 0n,
      totalEmissions: 0n,
      totalEmissionsUSD: 0n,
      totalBribesUSD: 0n,
      gaugeIsAlive: false,
      token0IsWhitelisted: poolToken0?.isWhitelisted ?? false,
      token1IsWhitelisted: poolToken1?.isWhitelisted ?? false,
      lastUpdatedTimestamp: new Date(event.block.timestamp * 1000),
      lastSnapshotTimestamp: new Date(event.block.timestamp * 1000),
      // Required BigDecimal fields
      untrackedVolumeUSD: ZERO_BN,
      txCount: 0n,
      buyCount: 0n,
      sellCount: 0n,
      totalValueLockedToken0: ZERO_BN,
      totalValueLockedToken1: ZERO_BN,
      totalValueLockedETH: ZERO_BN,
      totalValueLockedUSD: ZERO_BN,
      totalValueLockedUSDUntracked: ZERO_BN,
      liquidityProviderCount: 0n,
      lastOneMinuteArchived: 0n,
      lastOneMinuteRecorded: 0n,
      oneMinuteArray: [],
      lastFiveMinuteArchived: 0n,
      lastFiveMinuteRecorded: 0n,
      fiveMinuteArray: [],
    };

    updateLiquidityPoolAggregator(
      aggregator,
      aggregator,
      new Date(event.block.timestamp * 1000),
      context,
      event.block.number
    );

    // Update factory metrics using the new factory manager
    await updateFactoryOnPoolCreated(event.srcAddress, context);
  },
});
