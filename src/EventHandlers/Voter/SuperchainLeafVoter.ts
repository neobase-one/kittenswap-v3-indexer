import {
  SuperchainLeafVoter,
  type Voter_DistributeReward,
  type Voter_GaugeCreated,
  type Voter_Voted,
  type Voter_WhitelistToken,
} from "generated";

import type { Token } from "generated/src/Types.gen";
import { updateLiquidityPoolAggregator } from "../../Aggregators/LiquidityPoolAggregator";
import {
  CHAIN_CONSTANTS,
  TokenIdByChain,
  toChecksumAddress,
} from "../../Constants";
import { getErc20TokenDetails } from "../../Erc20";
import { normalizeTokenAmountTo1e18 } from "../../Helpers";
import { multiplyBase1e18 } from "../../Maths";
import { poolLookupStoreManager } from "../../Store";
import { getIsAlive, getTokensDeposited } from "./common";

const { getPoolAddressByGaugeAddress, addRewardAddressDetails } =
  poolLookupStoreManager();

SuperchainLeafVoter.Voted.handler(async ({ event, context }) => {
  const entity: Voter_Voted = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    sender: event.params.sender,
    pool: event.params.pool,
    tokenId: event.params.tokenId,
    weight: event.params.weight,
    totalWeight: event.params.totalWeight,
    transactionHash: event.transaction.hash,
    timestamp: new Date(event.block.timestamp * 1000),
    blockNumber: event.block.number,
    logIndex: event.logIndex,
    chainId: event.chainId,
  };

  context.Voter_Voted.set(entity);
});

SuperchainLeafVoter.GaugeCreated.contractRegister(({ event, context }) => {
  context.addVotingReward(event.params.incentiveVotingReward);
  context.addVotingReward(event.params.feeVotingReward);
  context.addGauge(event.params.gauge);
  context.addCLGauge(event.params.gauge);
});

SuperchainLeafVoter.GaugeCreated.handler(async ({ event, context }) => {
  const entity: Voter_GaugeCreated = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    poolFactory: event.params.poolFactory,
    votingRewardsFactory: event.params.votingRewardsFactory,
    gaugeFactory: event.params.gaugeFactory,
    pool: event.params.pool,
    bribeVotingReward: event.params.incentiveVotingReward,
    feeVotingReward: event.params.feeVotingReward,
    gauge: event.params.gauge,
    creator: "",
    timestamp: new Date(event.block.timestamp * 1000), // Convert to Date
    blockNumber: event.block.number,
    logIndex: event.logIndex,
    chainId: event.chainId,
    transactionHash: event.transaction.hash,
  };

  context.Voter_GaugeCreated.set(entity);

  // The pool entity should be created via PoolCreated event from the PoolFactory contract
  // Store pool details in poolRewardAddressStore
  const currentPoolRewardAddressMapping = {
    poolAddress: toChecksumAddress(event.params.pool),
    gaugeAddress: toChecksumAddress(event.params.gauge),
    bribeVotingRewardAddress: toChecksumAddress(
      event.params.incentiveVotingReward,
    ),
    // feeVotingRewardAddress: event.params.feeVotingReward, // currently not used
  };

  addRewardAddressDetails(event.chainId, currentPoolRewardAddressMapping);
});

SuperchainLeafVoter.DistributeReward.handlerWithLoader({
  loader: async ({ event, context }) => {
    const poolAddress = getPoolAddressByGaugeAddress(
      event.chainId,
      event.params.gauge,
    );

    const rewardTokenAddress = CHAIN_CONSTANTS[event.chainId].rewardToken(
      event.block.number,
    );

    const promisePool = poolAddress
      ? context.LiquidityPoolAggregator.get(poolAddress)
      : null;

    if (!poolAddress) {
      context.log.warn(
        `No pool address found for the gauge address ${event.params.gauge.toString()} on chain ${
          event.chainId
        }`,
      );
    }

    const [currentLiquidityPool, rewardToken] = await Promise.all([
      promisePool,
      context.Token.get(TokenIdByChain(rewardTokenAddress, event.chainId)),
    ]);

    return { currentLiquidityPool, rewardToken };
  },
  handler: async ({ event, context, loaderReturn }) => {
    if (loaderReturn?.rewardToken) {
      const { currentLiquidityPool, rewardToken } = loaderReturn;

      const isAlive = await getIsAlive(
        event.srcAddress,
        event.params.gauge,
        event.block.number,
        event.chainId,
      );
      const tokensDeposited = await getTokensDeposited(
        rewardToken.address,
        event.params.gauge,
        event.block.number,
        event.chainId,
      );

      // Dev note: Assumption here is that the GaugeCreated event has already been indexed and the Gauge entity has been created
      // Dev note: Assumption here is that the reward token (VELO for Optimism and AERO for Base) entity has already been created at this point
      if (currentLiquidityPool && rewardToken) {
        const normalizedEmissionsAmount = normalizeTokenAmountTo1e18(
          event.params.amount,
          Number(rewardToken.decimals),
        );

        const normalizedVotesDepositedAmount = normalizeTokenAmountTo1e18(
          BigInt(tokensDeposited.toString()),
          Number(rewardToken.decimals),
        );

        // If the reward token does not have a price in USD, log
        if (rewardToken.pricePerUSDNew === 0n) {
          context.log.warn(
            `Reward token with ID ${rewardToken.id.toString()} does not have a USD price yet on chain ${event.chainId}`,
          );
        }

        const normalizedEmissionsAmountUsd = multiplyBase1e18(
          normalizedEmissionsAmount,
          rewardToken.pricePerUSDNew,
        );

        const normalizedVotesDepositedAmountUsd = multiplyBase1e18(
          normalizedVotesDepositedAmount,
          rewardToken.pricePerUSDNew,
        );

        // Create a new instance of LiquidityPoolEntity to be updated in the DB
        const lpDiff = {
          totalVotesDeposited: tokensDeposited,
          totalVotesDepositedUSD: normalizedVotesDepositedAmountUsd,
          totalEmissions:
            currentLiquidityPool.totalEmissions + normalizedEmissionsAmount,
          totalEmissionsUSD:
            currentLiquidityPool.totalEmissionsUSD +
            normalizedEmissionsAmountUsd,
          lastUpdatedTimestamp: new Date(event.block.timestamp * 1000),
          gaugeAddress: event.params.gauge,
          gaugeIsAlive: isAlive,
        };

        // Update the LiquidityPoolEntity in the DB
        updateLiquidityPoolAggregator(
          lpDiff,
          currentLiquidityPool,
          new Date(event.block.timestamp * 1000),
          context,
          event.block.number,
        );
      } else {
        // If there is no pool entity with the particular gauge address, log the error
        context.log.warn(
          `No pool entity or reward token found for the gauge address ${event.params.gauge.toString()} on chain ${event.chainId}`,
        );
      }

      const entity: Voter_DistributeReward = {
        id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
        sender: event.params.sender,
        gauge: event.params.gauge,
        amount: BigInt(event.params.amount),
        pool: currentLiquidityPool?.id || "",
        tokensDeposited: BigInt(tokensDeposited.toString()),
        timestamp: new Date(event.block.timestamp * 1000),
        blockNumber: event.block.number,
        logIndex: event.logIndex,
        chainId: event.chainId,
        transactionHash: event.transaction.hash,
      };

      context.Voter_DistributeReward.set(entity);
    }
  },
});

/**
 * Handles the WhitelistToken event for the Voter contract.
 *
 * This handler is triggered when a WhitelistToken event is emitted by the Voter contract.
 * It creates a new Voter_WhitelistToken entity and stores it in the context.
 *
 * The Voter_WhitelistToken entity contains the following fields:
 * - id: A unique identifier for the event, composed of the chain ID, block number, and log index.
 * - whitelister: The address of the entity that performed the whitelisting.
 * - token: The address of the token being whitelisted.
 * - isWhitelisted: A boolean indicating whether the token is whitelisted.
 * - timestamp: The timestamp of the block in which the event was emitted, converted to a Date object.
 * - chainId: The ID of the blockchain network where the event occurred.
 *
 * @param {Object} event - The event object containing details of the WhitelistToken event.
 * @param {Object} context - The context object used to interact with the data store.
 */
SuperchainLeafVoter.WhitelistToken.handlerWithLoader({
  loader: async ({ event, context }) => {
    const token = await context.Token.get(
      TokenIdByChain(event.params.token, event.chainId),
    );
    return { token };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const entity: Voter_WhitelistToken = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      whitelister: event.params.whitelister,
      token: event.params.token,
      isWhitelisted: event.params._bool,
      timestamp: new Date(event.block.timestamp * 1000),
      blockNumber: event.block.number,
      logIndex: event.logIndex,
      chainId: event.chainId,
      transactionHash: event.transaction.hash,
    };

    context.Voter_WhitelistToken.set(entity);

    // Update the Token entity in the DB, either by updating the existing one or creating a new one
    if (loaderReturn?.token) {
      const { token } = loaderReturn;
      const updatedToken: Token = {
        ...token,
        isWhitelisted: event.params._bool,
      };

      context.Token.set(updatedToken as Token);
      return;
    }

    try {
      const tokenDetails = await getErc20TokenDetails(
        event.params.token,
        event.chainId,
      );
      const updatedToken: Token = {
        id: TokenIdByChain(event.params.token, event.chainId),
        name: tokenDetails.name,
        symbol: tokenDetails.symbol,
        pricePerUSDNew: 0n,
        address: event.params.token,
        chainId: event.chainId,
        decimals: BigInt(tokenDetails.decimals),
        isWhitelisted: event.params._bool,
        lastUpdatedTimestamp: new Date(event.block.timestamp * 1000),
      };
      context.Token.set(updatedToken);
    } catch (error) {
      context.log.error(
        `Error in superchain leaf voter whitelist token event fetching token details for ${event.params.token} on chain ${event.chainId}: ${error}`,
      );
    }
  },
});
