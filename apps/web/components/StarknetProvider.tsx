"use client";

import type { Chain } from "@starknet-react/chains";
import { sepolia } from "@starknet-react/chains";
import { StarknetConfig, argent, braavos, jsonRpcProvider } from "@starknet-react/core";
import type { ReactNode } from "react";

const chains = [sepolia];

function resolveRpcUrl(chain: Chain): string | undefined {
  const envUrl = process.env.NEXT_PUBLIC_RPC_URL;
  if (envUrl && envUrl.length > 0) {
    return envUrl;
  }

  return chain.rpcUrls.public.http[0] ?? chain.rpcUrls.default.http[0];
}

const provider = jsonRpcProvider({
  rpc: (chain) => {
    const nodeUrl = resolveRpcUrl(chain);
    if (!nodeUrl) {
      return null;
    }

    return { nodeUrl };
  }
});

const connectors = [argent(), braavos()];

type StarknetProviderProps = {
  children: ReactNode;
};

export function StarknetProvider({ children }: StarknetProviderProps) {
  return (
    <StarknetConfig chains={chains} provider={provider} connectors={connectors} autoConnect>
      {children}
    </StarknetConfig>
  );
}
