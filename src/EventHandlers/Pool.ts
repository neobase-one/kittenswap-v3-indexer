import {
  Pool,
  type Pool_Burn,
  type Pool_Fees,
  type Pool_Mint,
  type Pool_Swap,
  type Pool_Sync,
} from "generated";

import { updateLiquidityPoolAggregator } from "../Aggregators/LiquidityPoolAggregator";
import { TokenIdByChain } from "../Constants";
import { fetchPoolLoaderData } from "../Pools/common";
import { refreshTokenPrice } from "../PriceOracle";
import { normalizeTokenAmountTo1e18 } from "./../Helpers";
import { multiplyBase1e18 } from "./../Maths";

Pool.Mint.handler(async ({ event, context }) => {
  const entity: Pool_Mint = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    sender: event.params.sender,
    transactionHash: event.transaction.hash,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
    sourceAddress: event.srcAddress,
    timestamp: new Date(event.block.timestamp * 1000),
    blockNumber: event.block.number,
    logIndex: event.logIndex,
    chainId: event.chainId,
  };

  context.Pool_Mint.set(entity);
});

Pool.Burn.handler(async ({ event, context }) => {
  const entity: Pool_Burn = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    sender: event.params.sender,
    to: event.params.to,
    amount0: event.params.amount0,
    amount1: event.params.amount1,
    sourceAddress: event.srcAddress,
    timestamp: new Date(event.block.timestamp * 1000),
    blockNumber: event.block.number,
    logIndex: event.logIndex,
    chainId: event.chainId,
    transactionHash: event.transaction.hash,
  };

  context.Pool_Burn.set(entity);
});

Pool.Fees.handlerWithLoader({
  loader: async ({ event, context }) => {
    return fetchPoolLoaderData(event.srcAddress, context, event.chainId);
  },
  handler: async ({ event, context, loaderReturn }) => {
    const entity: Pool_Fees = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      sender: event.params.sender,
      amount0: event.params.amount0,
      amount1: event.params.amount1,
      sourceAddress: event.srcAddress,
      timestamp: new Date(event.block.timestamp * 1000),
      blockNumber: event.block.number,
      logIndex: event.logIndex,
      chainId: event.chainId,
      transactionHash: event.transaction.hash,
    };

    context.Pool_Fees.set(entity);

    switch (loaderReturn._type) {
      case "success": {
        const { liquidityPoolAggregator, token0Instance, token1Instance } =
          loaderReturn;

        const tokenUpdateData = {
          totalFees0: event.params.amount0,
          totalFees1: event.params.amount1,
          totalFeesNormalized0: 0n,
          totalFeesNormalized1: 0n,
          totalFeesUSD: 0n,
          totalFeesUSDWhitelisted: 0n,
        };

        tokenUpdateData.totalFeesNormalized0 = normalizeTokenAmountTo1e18(
          event.params.amount0,
          Number(token0Instance.decimals),
        );
        const token0FeesUSD = multiplyBase1e18(
          tokenUpdateData.totalFeesNormalized0,
          token0Instance.pricePerUSDNew,
        );

        tokenUpdateData.totalFeesUSD += token0FeesUSD;
        tokenUpdateData.totalFeesUSDWhitelisted += token0Instance.isWhitelisted
          ? token0FeesUSD
          : 0n;

        tokenUpdateData.totalFees1 = event.params.amount1;
        tokenUpdateData.totalFeesNormalized1 = normalizeTokenAmountTo1e18(
          event.params.amount1,
          Number(token1Instance.decimals),
        );
        const token1FeesUSD = multiplyBase1e18(
          tokenUpdateData.totalFeesNormalized1,
          token1Instance.pricePerUSDNew,
        );
        tokenUpdateData.totalFeesUSD += token1FeesUSD;
        tokenUpdateData.totalFeesUSDWhitelisted += token1Instance.isWhitelisted
          ? token1FeesUSD
          : 0n;

        const liquidityPoolDiff = {
          totalFees0:
            liquidityPoolAggregator.totalFees0 + tokenUpdateData.totalFees0,
          totalFees1:
            liquidityPoolAggregator.totalFees1 + tokenUpdateData.totalFees1,
          totalFeesUSD:
            liquidityPoolAggregator.totalFeesUSD + tokenUpdateData.totalFeesUSD,
          totalFeesUSDWhitelisted:
            liquidityPoolAggregator.totalFeesUSDWhitelisted +
            tokenUpdateData.totalFeesUSDWhitelisted,
          lastUpdatedTimestamp: new Date(event.block.timestamp * 1000),
        };

        updateLiquidityPoolAggregator(
          liquidityPoolDiff,
          liquidityPoolAggregator,
          liquidityPoolDiff.lastUpdatedTimestamp,
          context,
          event.block.number,
        );
        return;
      }
      case "TokenNotFoundError":
        context.log.error(loaderReturn.message);
        return;
      case "LiquidityPoolAggregatorNotFoundError":
        context.log.error(loaderReturn.message);
        return;

      default: {
        const _exhaustiveCheck: never = loaderReturn;
        return _exhaustiveCheck;
      }
    }
  },
});

Pool.Swap.handlerWithLoader({
  loader: async ({ event, context }) => {
    return fetchPoolLoaderData(event.srcAddress, context, event.chainId);
  },
  handler: async ({ event, context, loaderReturn }) => {
    const blockDatetime = new Date(event.block.timestamp * 1000);

    const entity: Pool_Swap = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      sender: event.params.sender,
      to: event.params.to,
      amount0In: event.params.amount0In,
      amount1In: event.params.amount1In,
      amount0Out: event.params.amount0Out,
      amount1Out: event.params.amount1Out,
      sourceAddress: event.srcAddress, // Add sourceAddress
      timestamp: blockDatetime, // Convert to Date
      blockNumber: event.block.number,
      logIndex: event.logIndex,
      chainId: event.chainId,
      transactionHash: event.transaction.hash,
    };

    context.Pool_Swap.set(entity);
    switch (loaderReturn._type) {
      case "success": {
        const { liquidityPoolAggregator, token0Instance, token1Instance } =
          loaderReturn;

        let token0 = token0Instance;
        let token1 = token1Instance;

        const tokenUpdateData = {
          netAmount0: 0n,
          netAmount1: 0n,
          netVolumeToken0USD: 0n,
          netVolumeToken1USD: 0n,
          volumeInUSD: 0n,
          volumeInUSDWhitelisted: 0n,
        };

        tokenUpdateData.netAmount0 =
          event.params.amount0In + event.params.amount0Out;
        try {
          token0 = await refreshTokenPrice(
            token0,
            event.block.number,
            event.block.timestamp,
            event.chainId,
            context,
          );
        } catch (error) {
          context.log.error(
            `Error refreshing token price for ${token0?.address} on chain ${event.chainId}: ${error}`,
          );
        }
        const normalizedAmount0 = normalizeTokenAmountTo1e18(
          event.params.amount0In + event.params.amount0Out,
          Number(token0.decimals),
        );
        tokenUpdateData.netVolumeToken0USD = multiplyBase1e18(
          normalizedAmount0,
          token0.pricePerUSDNew,
        );

        tokenUpdateData.netAmount1 =
          event.params.amount1In + event.params.amount1Out;
        try {
          token1 = await refreshTokenPrice(
            token1,
            event.block.number,
            event.block.timestamp,
            event.chainId,
            context,
          );
        } catch (error) {
          context.log.error(
            `Error refreshing token price for ${token1?.address} on chain ${event.chainId}: ${error}`,
          );
        }
        const normalizedAmount1 = normalizeTokenAmountTo1e18(
          event.params.amount1In + event.params.amount1Out,
          Number(token1.decimals),
        );
        tokenUpdateData.netVolumeToken1USD = multiplyBase1e18(
          normalizedAmount1,
          token1.pricePerUSDNew,
        );

        // Use volume from token 0 if it's priced, otherwise use token 1
        tokenUpdateData.volumeInUSD =
          tokenUpdateData.netVolumeToken0USD !== 0n
            ? tokenUpdateData.netVolumeToken0USD
            : tokenUpdateData.netVolumeToken1USD;

        // If both tokens are whitelisted, add the volume of token0 to the whitelisted volume
        tokenUpdateData.volumeInUSDWhitelisted +=
          token0?.isWhitelisted && token1?.isWhitelisted
            ? tokenUpdateData.netVolumeToken0USD
            : 0n;

        const liquidityPoolDiff = {
          totalVolume0:
            liquidityPoolAggregator.totalVolume0 + tokenUpdateData.netAmount0,
          totalVolume1:
            liquidityPoolAggregator.totalVolume1 + tokenUpdateData.netAmount1,
          totalVolumeUSD:
            liquidityPoolAggregator.totalVolumeUSD +
            tokenUpdateData.volumeInUSD,
          totalVolumeUSDWhitelisted:
            liquidityPoolAggregator.totalVolumeUSDWhitelisted +
            tokenUpdateData.volumeInUSDWhitelisted,
          token0Price:
            token0Instance?.pricePerUSDNew ??
            liquidityPoolAggregator.token0Price,
          token1Price:
            token1Instance?.pricePerUSDNew ??
            liquidityPoolAggregator.token1Price,
          numberOfSwaps: liquidityPoolAggregator.numberOfSwaps + 1n,
          token0IsWhitelisted: token0Instance?.isWhitelisted ?? false,
          token1IsWhitelisted: token1Instance?.isWhitelisted ?? false,
          lastUpdatedTimestamp: new Date(event.block.timestamp * 1000),
        };

        updateLiquidityPoolAggregator(
          liquidityPoolDiff,
          liquidityPoolAggregator,
          liquidityPoolDiff.lastUpdatedTimestamp,
          context,
          event.block.number,
        );
        return;
      }
      case "TokenNotFoundError":
        context.log.error(loaderReturn.message);
        return;
      case "LiquidityPoolAggregatorNotFoundError":
        context.log.error(loaderReturn.message);
        return;
      default: {
        const _exhaustiveCheck: never = loaderReturn;
        return _exhaustiveCheck;
      }
    }
  },
});

/**
 * Sync event handler.
 * @notice This event is triggered by Uniswap V2 factory when a new LP position is created, and updates the reserves for the pool.
 */
Pool.Sync.handlerWithLoader({
  loader: async ({ event, context }) => {
    return fetchPoolLoaderData(event.srcAddress, context, event.chainId);
  },
  handler: async ({ event, context, loaderReturn }) => {
    switch (loaderReturn._type) {
      case "success": {
        const { liquidityPoolAggregator, token0Instance, token1Instance } =
          loaderReturn;
        const blockDatetime = new Date(event.block.timestamp * 1000);
        const entity: Pool_Sync = {
          id: `${event.chainId}_${liquidityPoolAggregator.id}_${event.block.number}_${event.logIndex}`,
          reserve0: event.params.reserve0,
          reserve1: event.params.reserve1,
          sourceAddress: event.srcAddress,
          timestamp: blockDatetime,
          blockNumber: event.block.number,
          logIndex: event.logIndex,
          chainId: event.chainId,
          transactionHash: event.transaction.hash,
        };

        context.Pool_Sync.set(entity);

        const tokenUpdateData = {
          totalLiquidityUSD: 0n,
          normalizedReserve0: 0n,
          normalizedReserve1: 0n,
          token0PricePerUSDNew:
            token0Instance?.pricePerUSDNew ??
            liquidityPoolAggregator.token0Price,
          token1PricePerUSDNew:
            token1Instance?.pricePerUSDNew ??
            liquidityPoolAggregator.token1Price,
        };

        // Update price and liquidity if the token is priced
        if (token0Instance) {
          tokenUpdateData.normalizedReserve0 += normalizeTokenAmountTo1e18(
            event.params.reserve0,
            Number(token0Instance.decimals),
          );
          tokenUpdateData.token0PricePerUSDNew = token0Instance.pricePerUSDNew;
          tokenUpdateData.totalLiquidityUSD += multiplyBase1e18(
            tokenUpdateData.normalizedReserve0,
            tokenUpdateData.token0PricePerUSDNew,
          );
        }

        if (token1Instance) {
          tokenUpdateData.normalizedReserve1 += normalizeTokenAmountTo1e18(
            event.params.reserve1,
            Number(token1Instance.decimals),
          );

          tokenUpdateData.token1PricePerUSDNew = token1Instance.pricePerUSDNew;
          tokenUpdateData.totalLiquidityUSD += multiplyBase1e18(
            tokenUpdateData.normalizedReserve1,
            tokenUpdateData.token1PricePerUSDNew,
          );
        }

        const liquidityPoolDiff = {
          reserve0: event.params.reserve0,
          reserve1: event.params.reserve1,
          totalLiquidityUSD:
            tokenUpdateData.totalLiquidityUSD ||
            liquidityPoolAggregator.totalLiquidityUSD,
          token0Price: tokenUpdateData.token0PricePerUSDNew,
          token1Price: tokenUpdateData.token1PricePerUSDNew,
          lastUpdatedTimestamp: blockDatetime,
        };

        updateLiquidityPoolAggregator(
          liquidityPoolDiff,
          liquidityPoolAggregator,
          liquidityPoolDiff.lastUpdatedTimestamp,
          context,
          event.block.number,
        );
        return;
      }
      case "TokenNotFoundError":
        context.log.error(loaderReturn.message);
        return;
      case "LiquidityPoolAggregatorNotFoundError":
        context.log.error(loaderReturn.message);
        return;
      default: {
        const _exhaustiveCheck: never = loaderReturn;
        return _exhaustiveCheck;
      }
    }
  },
});
