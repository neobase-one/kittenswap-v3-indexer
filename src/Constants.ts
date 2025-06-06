import dotenv from "dotenv";
import { Web3 } from "web3";
import {
  optimism,
  base,
  lisk,
  mode,
  fraxtal,
  ink,
  soneium,
  metalL2,
  unichain,
  celo,
  swellchain,
} from "viem/chains";
import { createPublicClient, defineChain, http, PublicClient } from "viem";
import PriceConnectors from "./constants/price_connectors.json";
import { BigNumber } from "bignumber.js";
import { BigDecimal } from "generated";

export const ZERO_BN = new BigNumber(0);

dotenv.config();

export const TEN_TO_THE_3_BI = BigInt(10 ** 3);
export const TEN_TO_THE_6_BI = BigInt(10 ** 6);
export const TEN_TO_THE_18_BI = BigInt(10 ** 18);
export const TEN_TO_THE_18_BD = new BigDecimal(10 ** 18);

export const SECONDS_IN_AN_HOUR = BigInt(3600);
export const SECONDS_IN_A_DAY = BigInt(86400);
export const SECONDS_IN_A_WEEK = BigInt(604800);

export const ZERO_BI = BigInt(0)
export const ONE_BI = BigInt(1)
export const ZERO_BD = BigNumber('0')
export const ONE_BD = BigNumber('1')
export const BI_18 = BigInt(18)

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";


type PriceConnector = {
  address: string;
  createdBlock: number;
};

export const OPTIMISM_PRICE_CONNECTORS: PriceConnector[] =
  PriceConnectors.optimism as PriceConnector[];

export const BASE_PRICE_CONNECTORS: PriceConnector[] =
  PriceConnectors.base as PriceConnector[];

export const MODE_PRICE_CONNECTORS: PriceConnector[] =
  PriceConnectors.mode as PriceConnector[];

export const LISK_PRICE_CONNECTORS: PriceConnector[] =
  PriceConnectors.lisk as PriceConnector[];

export const FRAXTAL_PRICE_CONNECTORS: PriceConnector[] =
  PriceConnectors.fraxtal as PriceConnector[];

export const SONEIUM_PRICE_CONNECTORS: PriceConnector[] =
  PriceConnectors.soneium as PriceConnector[];

export const INK_PRICE_CONNECTORS: PriceConnector[] =
  PriceConnectors.ink as PriceConnector[];

export const METAL_PRICE_CONNECTORS: PriceConnector[] =
  PriceConnectors.metal as PriceConnector[];

export const UNICHAIN_PRICE_CONNECTORS: PriceConnector[] =
  PriceConnectors.unichain as PriceConnector[];

export const CELO_PRICE_CONNECTORS: PriceConnector[] =
  PriceConnectors.celo as PriceConnector[];

export const SWELL_PRICE_CONNECTORS: PriceConnector[] =
  PriceConnectors.swell as PriceConnector[];

export const toChecksumAddress = (address: string) =>
  Web3.utils.toChecksumAddress(address);

export enum PriceOracleType {
  V3 = "v3",
  V2 = "v2",
  V1 = "v1",
}

// Object containing all the constants for a chain
type chainConstants = {
  weth: string;
  usdc: string;
  stablePool?: string;
  nativeTokenDetails?: {
    symbol: string;
    name: string;
    decimals: bigint;
  };
  minimumNativeLocked?: BigDecimal;
  oracle: {
    getType: (blockNumber: number) => PriceOracleType;
    getAddress: (priceOracleType: PriceOracleType) => string;
    startBlock: number;
    updateDelta: number;
    priceConnectors: PriceConnector[];
  };
  rewardToken: (blockNumber: number) => string;
  eth_client: PublicClient<any, any>;
};

// Constants for Optimism
const OPTIMISM_CONSTANTS: chainConstants = {
  weth: "0x4200000000000000000000000000000000000006",
  usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
  oracle: {
    getType: (blockNumber: number) => {
      if (blockNumber > 125484892) {
        return PriceOracleType.V3;
      } else if (blockNumber > 124076662) {
        return PriceOracleType.V2;
      } else {
        return PriceOracleType.V1;
      }
    },
    getAddress: (priceOracleType: PriceOracleType) => {
      switch (priceOracleType) {
        case PriceOracleType.V3:
          return "0x59114D308C6DE4A84F5F8cD80485a5481047b99f";
        case PriceOracleType.V2:
          return "0x6a3af44e23395d2470f7c81331add6ede8597306";
        case PriceOracleType.V1:
          return "0x395942C2049604a314d39F370Dfb8D87AAC89e16";
      }
    },
    startBlock: 107676013,
    updateDelta: 60 * 60, // 1 hour
    priceConnectors: OPTIMISM_PRICE_CONNECTORS,
  },
  rewardToken: (blockNumber: number) => {
    if (blockNumber < 105896880) {
      return "0x3c8B650257cFb5f272f799F5e2b4e65093a11a05";
    }
    return "0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db";
  },
  eth_client: createPublicClient({
    chain: optimism,
    transport: http(
      process.env.ENVIO_OPTIMISM_RPC_URL || "https://optimism.llamarpc.com",
      {
        retryCount: 10,
        retryDelay: 1000,
        batch: false,
      }
    ),
  }),
};

// Constants for Base
const BASE_CONSTANTS: chainConstants = {
  weth: "0x4200000000000000000000000000000000000006",
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  oracle: {
    getType: (blockNumber: number) => {
      if (blockNumber > 19862773) {
        return PriceOracleType.V3;
      } else if (blockNumber > 18480097) {
        return PriceOracleType.V2;
      } else {
        return PriceOracleType.V1;
      }
    },
    getAddress: (priceOracleType: PriceOracleType) => {
      switch (priceOracleType) {
        case PriceOracleType.V3:
          return "0x3B06c787711ecb5624cE65AC8F26cde10831eb0C";
        case PriceOracleType.V2:
          return "0xcbf5b6abf55fb87271338097fdd03e9d82a9d63f";
        case PriceOracleType.V1:
          return "0xe58920a8c684CD3d6dCaC2a41b12998e4CB17EfE";
      }
    },
    startBlock: 3219857,
    updateDelta: 60 * 60, // 1 hour
    priceConnectors: BASE_PRICE_CONNECTORS,
  },
  rewardToken: (blockNumber: Number) =>
    "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
  eth_client: createPublicClient({
    chain: base,
    transport: http(
      process.env.ENVIO_BASE_RPC_URL || "https://base.llamarpc.com",
      {
        retryCount: 10,
        retryDelay: 1000,
      }
    ),
  }),
};

// Constants for Lisk
const LISK_CONSTANTS: chainConstants = {
  weth: "0x4200000000000000000000000000000000000006",
  usdc: "0xF242275d3a6527d877f2c927a82D9b057609cc71",
  oracle: {
    getType: (blockNumber: number) => {
      if (blockNumber > 8457278) {
        return PriceOracleType.V3;
      } else {
        return PriceOracleType.V2;
      }
    },
    getAddress: (priceOracleType: PriceOracleType) => {
      switch (priceOracleType) {
        case PriceOracleType.V3:
          return "0x024503003fFE9AF285f47c1DaAaA497D9f1166D0";
        case PriceOracleType.V2:
          return "0xE50621a0527A43534D565B67D64be7C79807F269";
        case PriceOracleType.V1:
          return "0xE50621a0527A43534D565B67D64be7C79807F269";
      }
    },
    startBlock: 8380726,
    updateDelta: 60 * 60, // 1 hour
    priceConnectors: LISK_PRICE_CONNECTORS,
  },
  rewardToken: (blockNumber: number) =>
    "0x7f9AdFbd38b669F03d1d11000Bc76b9AaEA28A81",
  eth_client: createPublicClient({
    chain: lisk,
    transport: http(process.env.ENVIO_LISK_RPC_URL || "https://lisk.drpc.org", {
      retryCount: 10,
      retryDelay: 1000,
    }),
  }),
};

// Constants for Mode
const MODE_CONSTANTS: chainConstants = {
  weth: "0x4200000000000000000000000000000000000006",
  usdc: "0xd988097fb8612cc24eeC14542bC03424c656005f",
  oracle: {
    getType: (blockNumber: number) => {
      if (blockNumber > 15738649) {
        return PriceOracleType.V3;
      } else {
        return PriceOracleType.V2;
      }
    },
    getAddress: (priceOracleType: PriceOracleType) => {
      switch (priceOracleType) {
        case PriceOracleType.V3:
          return "0xbAEe949B52cb503e39f1Df54Dcee778da59E11bc";
        case PriceOracleType.V2:
          return "0xE50621a0527A43534D565B67D64be7C79807F269";
        case PriceOracleType.V1:
          return "0xE50621a0527A43534D565B67D64be7C79807F269";
      }
    },
    startBlock: 15591759,
    updateDelta: 60 * 60, // 1 hour
    priceConnectors: MODE_PRICE_CONNECTORS,
  },
  rewardToken: (blockNumber: number) =>
    "0x7f9AdFbd38b669F03d1d11000Bc76b9AaEA28A81",
  eth_client: createPublicClient({
    chain: mode,
    transport: http(
      process.env.ENVIO_MODE_RPC_URL || "https://mainnet.mode.network",
      {
        retryCount: 10,
        retryDelay: 1000,
      }
    ),
  }),
};

// Constants for Celo
const CELO_CONSTANTS: chainConstants = {
  weth: "0x4200000000000000000000000000000000000006",
  usdc: "0x37f750B7cC259A2f741AF45294f6a16572CF5cAd",
  oracle: {
    getType: (blockNumber: number) => {
      return PriceOracleType.V3;
    },
    getAddress: (priceOracleType: PriceOracleType) => {
      return "0xe58920a8c684CD3d6dCaC2a41b12998e4CB17EfE";
    },
    startBlock: 31278773,
    updateDelta: 60 * 60, // 1 hour
    priceConnectors: CELO_PRICE_CONNECTORS,
  },
  rewardToken: (blockNumber: number) =>
    "0x7f9AdFbd38b669F03d1d11000Bc76b9AaEA28A81",
  eth_client: createPublicClient({
    chain: celo,
    transport: http(
      process.env.ENVIO_CELO_RPC_URL || "https://forno.celo.org",
      {
        retryCount: 10,
        retryDelay: 1000,
      }
    ),
  }),
};

// Constants for Soneium
const SONEIUM_CONSTANTS: chainConstants = {
  weth: "0x4200000000000000000000000000000000000006",
  usdc: "0xbA9986D2381edf1DA03B0B9c1f8b00dc4AacC369",
  oracle: {
    getType: (blockNumber: number) => {
      return PriceOracleType.V3;
    },
    getAddress: (priceOracleType: PriceOracleType) => {
      return "0xe58920a8c684CD3d6dCaC2a41b12998e4CB17EfE";
    },
    startBlock: 1863998, // TODO: Get start block
    updateDelta: 60 * 60, // 1 hour
    priceConnectors: SONEIUM_PRICE_CONNECTORS,
  },
  rewardToken: (blockNumber: number) =>
    "0x7f9AdFbd38b669F03d1d11000Bc76b9AaEA28A81",
  eth_client: createPublicClient({
    chain: soneium,
    transport: http(
      process.env.ENVIO_SONEIUM_RPC_URL || "https://rpc.soneium.com",
      {
        retryCount: 10,
        retryDelay: 1000,
      }
    ),
  }),
};

// Constants for Unichain
const UNICHAIN_CONSTANTS: chainConstants = {
  weth: "0x4200000000000000000000000000000000000006",
  usdc: "0x078D782b760474a361dDA0AF3839290b0EF57AD6",
  oracle: {
    getType: (blockNumber: number) => {
      return PriceOracleType.V3;
    },
    getAddress: (priceOracleType: PriceOracleType) => {
      return "0xe58920a8c684CD3d6dCaC2a41b12998e4CB17EfE";
    },
    startBlock: 9415475,
    updateDelta: 60 * 60, // 1 hour
    priceConnectors: UNICHAIN_PRICE_CONNECTORS,
  },
  rewardToken: (blockNumber: number) =>
    "0x7f9AdFbd38b669F03d1d11000Bc76b9AaEA28A81",
  eth_client: createPublicClient({
    chain: unichain,
    transport: http(
      process.env.ENVIO_UNICHAIN_RPC_URL || "	https://mainnet.unichain.org",
      {
        retryCount: 10,
        retryDelay: 1000,
      }
    ),
  }),
};

// Constants for Fraxtal
const FRAXTAL_CONSTANTS: chainConstants = {
  weth: "0xFC00000000000000000000000000000000000006",
  usdc: "0xFc00000000000000000000000000000000000001",
  oracle: {
    getType: (blockNumber: number) => {
      if (blockNumber > 12710720) {
        return PriceOracleType.V3;
      } else {
        return PriceOracleType.V2;
      }
    },
    getAddress: (priceOracleType: PriceOracleType) => {
      switch (priceOracleType) {
        case PriceOracleType.V3:
          return "0x4817f8D70aE32Ee96e5E6BFA24eb7Fcfa83bbf29";
        case PriceOracleType.V2:
          return "0xE50621a0527A43534D565B67D64be7C79807F269";
        case PriceOracleType.V1:
          return "0xE50621a0527A43534D565B67D64be7C79807F269";
      }
    },
    startBlock: 12640176,
    updateDelta: 60 * 60, // 1 hour
    priceConnectors: FRAXTAL_PRICE_CONNECTORS,
  },
  rewardToken: (blockNumber: number) =>
    "0x7f9AdFbd38b669F03d1d11000Bc76b9AaEA28A81",
  eth_client: createPublicClient({
    chain: fraxtal,
    transport: http(
      process.env.ENVIO_FRAXTAL_RPC_URL || "https://fraxtal.drpc.org",
      {
        retryCount: 10,
        retryDelay: 1000,
      }
    ),
  }),
};

// Constants for Ink
const INK_CONSTANTS: chainConstants = {
  weth: "0x4200000000000000000000000000000000000006",
  usdc: "0xF1815bd50389c46847f0Bda824eC8da914045D14",
  oracle: {
    getType: (blockNumber: number) => {
      return PriceOracleType.V3;
    },
    getAddress: (priceOracleType: PriceOracleType) => {
      return "0xe58920a8c684CD3d6dCaC2a41b12998e4CB17EfE";
    },
    startBlock: 3361885,
    updateDelta: 60 * 60, // 1 hour
    priceConnectors: INK_PRICE_CONNECTORS,
  },
  rewardToken: (blockNumber: number) =>
    "0x7f9AdFbd38b669F03d1d11000Bc76b9AaEA28A81",
  eth_client: createPublicClient({
    chain: ink,
    transport: http(
      process.env.ENVIO_INK_RPC_URL || "https://rpc-gel.inkonchain.com",
      {
        retryCount: 10,
        retryDelay: 1000,
      }
    ),
  }),
};

// Constants for Metal
const METAL_CONSTANTS: chainConstants = {
  weth: "0x4200000000000000000000000000000000000006",
  usdc: "0xb91CFCcA485C6E40E3bC622f9BFA02a8ACdEeBab",
  oracle: {
    getType: (blockNumber: number) => {
      return PriceOracleType.V3;
    },
    getAddress: (priceOracleType: PriceOracleType) => {
      return "0x3e71CCdf495d9628D3655A600Bcad3afF2ddea98";
    },
    startBlock: 11438647,
    updateDelta: 60 * 60, // 1 hour
    priceConnectors: METAL_PRICE_CONNECTORS,
  },
  rewardToken: (blockNumber: number) =>
    "0x7f9AdFbd38b669F03d1d11000Bc76b9AaEA28A81",
  eth_client: createPublicClient({
    chain: metalL2,
    transport: http(
      process.env.ENVIO_METAL_RPC_URL || "https://rpc.metall2.com",
      {
        retryCount: 10,
        retryDelay: 1000,
      }
    ),
  }),
};

// Constants for Swell
const SWELL_CONSTANTS: chainConstants = {
  weth: "0x4200000000000000000000000000000000000006",
  usdc: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", // USDe since usdc is not available
  oracle: {
    getType: (blockNumber: number) => {
      return PriceOracleType.V3;
    },
    getAddress: (priceOracleType: PriceOracleType) => {
      return "0xe58920a8c684CD3d6dCaC2a41b12998e4CB17EfE";
    },
    startBlock: 3733759,
    updateDelta: 60 * 60, // 1 hour
    priceConnectors: SWELL_PRICE_CONNECTORS,
  },
  rewardToken: (blockNumber: number) =>
    "0x7f9AdFbd38b669F03d1d11000Bc76b9AaEA28A81",
  eth_client: createPublicClient({
    chain: swellchain,
    transport: http(
      process.env.ENVIO_SWELL_RPC_URL || "https://rpc.ankr.com/swell",
      {
        retryCount: 10,
        retryDelay: 1000,
      }
    ),
  }) as PublicClient,
};

// Constants for Hyperliquid
export const hyperliquid = defineChain({
  id: 645749,
  name: "Hyperliquid",
  nativeCurrency: { name: "Hype", symbol: "HYPE", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://hyperliquid.rpc.hypersync.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Hyperliquid Explorer",
      url: "https://www.hyperscan.com",
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 13051
    }
  }
})

const HYPERLIQUID_CONSTANTS: chainConstants = {
  weth: "0x5555555555555555555555555555555555555555", // wHYPE
  usdc: "0xca79db4b49f608ef54a5cb813fbed3a6387bc645", // USDXL
  stablePool: "0x5Ad00c0fb20046448d924F7a674C9F25CaE8bBCb", // wHYPE/USDXL
  nativeTokenDetails: {
    symbol: "HYPE",
    name: "HYPE",
    decimals: BigInt(18),
  },
  minimumNativeLocked: BigDecimal("1"),
  oracle: { // todo
    getType: (blockNumber: number) => {
      return PriceOracleType.V3;
    },
    getAddress: (priceOracleType: PriceOracleType) => {
      return "0xe58920a8c684CD3d6dCaC2a41b12998e4CB17EfE";
    },
    startBlock: 3733759,
    updateDelta: 60 * 60, // 1 hour
    priceConnectors: SWELL_PRICE_CONNECTORS,
  },
  rewardToken: (blockNumber: number) => "0x7f9AdFbd38b669F03d1d11000Bc76b9AaEA28A81", // todo
  eth_client: createPublicClient({
    chain: hyperliquid,
    transport: http(
      process.env.ENVIO_HYPERLIQUID_RPC_URL || "http://52.69.115.90:3001/evm",
      {
        retryCount: 10,
        retryDelay: 1000,
      }
    ),
  }) as PublicClient,
};

/**
 * Create a unique ID for a token on a specific chain. Really should only be used for Token Entities.
 * @param address
 * @param chainId
 * @returns string Merged Token ID.
 */
export const TokenIdByChain = (address: string, chainId: number) =>
  `${toChecksumAddress(address)}`;

/**
 * Create a unique ID for a token on a specific chain at a specific block. Really should only be used
 * for TokenPrice Entities.
 * @param address
 * @param chainId
 * @param blockNumber
 * @returns string Merged Token ID.
 */
export const TokenIdByBlock = (
  address: string,
  chainId: number,
  blockNumber: number
) => `${chainId}_${toChecksumAddress(address)}_${blockNumber}`;

// Key is chain ID
export const CHAIN_CONSTANTS: Record<number, chainConstants> = {
  10: OPTIMISM_CONSTANTS,
  8453: BASE_CONSTANTS,
  34443: MODE_CONSTANTS,
  1135: LISK_CONSTANTS,
  252: FRAXTAL_CONSTANTS,
  1750: METAL_CONSTANTS,
  1868: SONEIUM_CONSTANTS,
  57073: INK_CONSTANTS,
  130: UNICHAIN_CONSTANTS,
  42220: CELO_CONSTANTS,
  1923: SWELL_CONSTANTS,
  645749: HYPERLIQUID_CONSTANTS
};

export const CacheCategory = {
  Token: "token",
  GuageToPool: "guageToPool",
  BribeToPool: "bribeToPool",
} as const;

export type CacheCategory = (typeof CacheCategory)[keyof typeof CacheCategory];
