"use client";

import { useAccount, useBalance, useConnect, useDisconnect, useNetwork } from "@starknet-react/core";

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatChainId(chainId?: bigint): string {
  if (!chainId) {
    return "n/a";
  }

  return `0x${chainId.toString(16)}`;
}

function formatBalance(balance?: string): string {
  if (!balance) {
    return "-";
  }

  const asNumber = Number(balance);
  if (Number.isNaN(asNumber)) {
    return balance;
  }

  return asNumber.toFixed(4);
}

export function WalletPanel() {
  const { address, chainId, connector, isConnected, status } = useAccount();
  const { chain } = useNetwork();
  const { connectors, connect, pendingConnector, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();

  const { data: balanceData, isLoading: isBalanceLoading } = useBalance({
    address,
    enabled: Boolean(address),
    watch: true
  });

  const availableConnectors = connectors.filter((item) => item.available());

  return (
    <section className="panel-card animate-fadeInUp p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Wallet</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium uppercase ${
            isConnected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
          }`}
        >
          {status}
        </span>
      </div>

      {isConnected && address ? (
        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
          <p>
            <span className="font-semibold text-slate-900">Address:</span> {shortAddress(address)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Connector:</span> {connector?.name ?? "Unknown"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Chain:</span> {chain.name} ({formatChainId(chainId)})
          </p>
          <p>
            <span className="font-semibold text-slate-900">Balance:</span>{" "}
            {isBalanceLoading ? "loading..." : `${formatBalance(balanceData?.formatted)} ${balanceData?.symbol ?? "ETH"}`}
          </p>

          <button
            type="button"
            className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-60"
            onClick={() => disconnect()}
            disabled={isDisconnecting}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-slate-600">Connect Argent X or Braavos to enable policy signing and onchain commit.</p>

          {availableConnectors.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-600">
              No Starknet wallet detected. Install Argent X or Braavos extension first.
            </p>
          ) : (
            <div className="space-y-2">
              {availableConnectors.map((item) => {
                const waiting = isConnecting && pendingConnector?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                    onClick={() => connect({ connector: item })}
                    disabled={isConnecting}
                  >
                    <span>{item.name}</span>
                    <span className="text-xs text-slate-300">{waiting ? "connecting..." : "connect"}</span>
                  </button>
                );
              })}
            </div>
          )}

          {connectError && <p className="rounded-lg bg-rose-100 px-3 py-2 text-xs text-rose-800">{connectError.message}</p>}

          <p className="text-xs text-slate-500">RPC: {process.env.NEXT_PUBLIC_RPC_URL ?? "not configured"}</p>
        </div>
      )}
    </section>
  );
}
