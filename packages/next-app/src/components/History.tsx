"use client";

import usePrice from '@/hooks/usePrice';
import { getAssetAmount, getAssetIcon, getAssetName, getAssetShortName } from '@/lib/utils';
import { getBchHistoricalPriceFromOracle } from '@xmr-bch-swap/swap';
import { ArrowRightLeft } from 'lucide-react';
import moment from 'moment';
import { useEffect, useState } from 'react';

export interface HistoryItem {
  amountBch: number;
  txId: string;
  timestamp: number;
  value?: number;
}

const query = /* graphql */ `
query swapHistory {
  input (where: {
    redeem_bytecode_pattern: {_eq: "c3519dc4519d0200c600cc949d00cb641900cd788821ba6752b2752300cd8768"}
  })
  {
		value_satoshis
    transaction{
      hash
      block_inclusions {
        block {
          timestamp
          accepted_by {
            node {
              name
            }
          }
        }
      }
    }
  }
}
`;

const fetchHistory = async () => {
  let jsonResponse: { data?: { input?: Array<{value_satoshis: string, transaction: { hash: string, block_inclusions: Array<{ block: { timestamp: string, accepted_by: Array<{ node: { name: string} }> } }> }}> } } = {};
  try {
    const response = await fetch("https://gql.chaingraph.pat.mn/v1/graphql", {
      body: JSON.stringify({
        operationName: null,
        variables: {},
        query: query,
      }),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      method: "POST",
    });

    const textResponse = await response.text();

    jsonResponse = JSON.parse(textResponse.replaceAll("\\\\x", ""));
  } catch {
    return [];
  }

  const result = jsonResponse?.data?.input?.filter((item) =>
    item.transaction.block_inclusions.length === 0 || item.transaction.block_inclusions[0]?.block.accepted_by[0]?.node.name.toLowerCase().includes("mainnet")
  ).map((item) => {
    const amountBch = parseInt(item.value_satoshis);
    const txId = item.transaction.hash;
    const timestamp = item.transaction.block_inclusions.length ? parseInt(item.transaction.block_inclusions[0].block.timestamp) : 0;

    return {
      amountBch,
      txId,
      timestamp,
    } as HistoryItem;
  }) ?? [];

  console.log(result);

  result.sort((a, b) => a.timestamp === 0 || b.timestamp === 0 ? -b.timestamp : b.timestamp - a.timestamp);

  return result;
}

const asset = "BCH:native";
const targetAsset = "XMR:native";

export function History({historyItems}: { historyItems?: HistoryItem[] }) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const currentPrice = usePrice(asset);

  useEffect(() => {
    (async () => {
      let items = historyItems;
      if (!items) {
        const history = await fetchHistory();
        items = history;
      }

      setItems(items);
      Promise.all(items.map((item => {
        if (item.timestamp === 0) {
          return currentPrice ?? 0;
        }
        return getBchHistoricalPriceFromOracle(item.timestamp);
      }))).then((prices) => {
        setItems(prev => {
          prices.forEach((price, index) => {
            if (price) {
              prev[index].value = price * getAssetAmount(BigInt(prev[index].amountBch), asset);
            }
          });
          return [...prev];
        });
      });
    })();
  }, [historyItems, currentPrice]);

  return <div className='flex flex-col gap-4 items-center px-4'>
    <span className='text-center mb-5'>Total Volume {getAssetAmount(BigInt(items.reduce((prev, curr) => prev + curr.amountBch, 0)), asset)} BCH</span>
    {items.map((item, index) => (
      <div key={index} onClick={() => window.open(`http://explorer.bch.ninja/tx/${item.txId}`, "_blank")} className='cursor-pointer'>
        <div className="flex flex-row gap-5 items-center">
          <div className="flex flex-col text-right w-[80px]">
            <div className="text-sm">{getAssetAmount(BigInt(item.amountBch), asset)}</div>
            <div className="text-xs">{getAssetName(asset)}</div>
          </div>
          <div>
            <img width={32} height={32} src={getAssetIcon(asset)} alt={getAssetShortName(asset)} />
          </div>
          <ArrowRightLeft size={24} />
          <div>
            <img width={32} height={32} src={getAssetIcon(targetAsset)} alt={getAssetShortName(targetAsset)} />
          </div>
          <div className="flex flex-col text-left w-[80px]">
            <div className="text-sm">???</div>
            <div className="text-xs">{getAssetName(targetAsset)}</div>
          </div>
        </div>

        <div className="text-center">
          {item.value && <div className="text-sm font-normal">Value: ${item.value.toFixed(2)}</div>}
          <div className="text-xs">TxId: {item.txId.slice(0, 10)}...</div>
          {item.timestamp === 0 ? <div className="text-xs">Pending confirmation</div> : <div className="text-xs" title={moment(item.timestamp * 1000).calendar()}>Date: {moment(item.timestamp * 1000).fromNow()}</div>}
        </div>
      </div>
    ))}
  </div>;
};
