import { Card, CardContent } from "./ui/card";
import { Label } from "./ui/label";

import { ChevronsUpDown } from "lucide-react"

import { Asset, Assets, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ChangeEventHandler, useCallback, useState } from "react";
import { usePrices } from "@/providers/PriceProvider";
import usePrice from "@/hooks/usePrice";

export function SwapAssetCard ({cardTitle, asset, onAssetChange, value, onValueChange, className, showDeltas, onDeltaButtonClick} : {
  cardTitle: string,
  asset?: Asset,
  onAssetChange?: (asset: Asset | undefined) => void,
  value?: string,
  onValueChange?: ChangeEventHandler<HTMLInputElement>,
  className?: string,
  showDeltas?: boolean
  onDeltaButtonClick?: (delta: number) => void})
{
  const price = usePrice(asset?.assetId);
  const [open, setOpen] = useState(false);

  return (<div className={cn("flex flex-col gap-2", className)}>
    <Card className="w-[350px]">
      <CardContent className=" pt-6">
        <form>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name" className="text-[#7D7D7D] pl-2">{cardTitle}</Label>
              <div className="flex flex-row gap-2">
                <div className="flex flex-1">
                  <input id="name" placeholder="0" className="pl-2 w-[150px]" value={value} onChange={onValueChange} />
                </div>
                <div className="flex-none">
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-[120px] justify-between"
                      >
                        {asset ? <>
                          <img
                            src={asset.icon}
                            alt={asset.ticker}
                            className="h-[16px] w-[16px] rounded-full"
                          />
                          <span>{asset.ticker}</span>
                          </> : "Asset"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="min-w-[50px] p-0">
                      <Command className="rounded-lg border shadow-md md:min-w-[250px]">
                        <div className="p-3 border-b">Select asset</div>
                        <CommandInput placeholder="Search assets..." />
                        <CommandList>
                          <CommandEmpty>No results found.</CommandEmpty>
                          {["mainnet", "testnet", "regtest"].map((network, name) => (
                            <CommandGroup key={name} heading={network.charAt(0).toUpperCase() + network.slice(1)}>
                              {Assets[network].map((item) => (
                                <CommandItem
                                  key={item.assetId}
                                  onSelect={() => {onAssetChange?.(item); setOpen(false);}}
                                  value={item.assetId}
                                  forceSelected={item.assetId === asset?.assetId}
                                >
                                  <img
                                    src={item.icon}
                                    alt={item.ticker}
                                    className="h-[32px] w-[32px] rounded-full"
                                  />
                                  <div className="flex flex-col">
                                    <div className="text-lg font-light">{item.name}</div>
                                    <div className="flex flex-row gap-2">
                                      <div className="text-xs text-[#7D7D7D]">{item.ticker}</div>
                                      {item.assetId.split(":")[1] !== "native" && <div className="text-xs text-[#7D7D7D]">{item.assetId.split(":")[1].slice(0, 4)}...{item.assetId.split(":")[1].slice(-4)}</div>}
                                    </div>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <Label className="text-xs text-[#7D7D7D] pl-2">${((price ?? 0) * Number(value)).toFixed(2)}</Label>
              {showDeltas &&
                <div className="flex mt-2 p-1 rounded-lg justify-center gap-1">
                  <Button onClick={(e) => {e.preventDefault(); onDeltaButtonClick?.(-3);}} variant={"outline"} className="text-xs px-1 rounded-xl text-gray-400 hover:text-gray-500">-3%</Button>
                  <Button onClick={(e) => {e.preventDefault(); onDeltaButtonClick?.(-2);}} variant={"outline"} className="text-xs px-1 rounded-xl text-gray-400 hover:text-gray-500">-2%</Button>
                  <Button onClick={(e) => {e.preventDefault(); onDeltaButtonClick?.(-1);}} variant={"outline"} className="text-xs px-1 rounded-xl text-gray-400 hover:text-gray-500">-1%</Button>
                  <Button onClick={(e) => {e.preventDefault(); onDeltaButtonClick?.(+0);}} variant={"outline"} className="text-xs px-1 rounded-xl text-gray-400 hover:text-gray-500">reset</Button>
                  <Button onClick={(e) => {e.preventDefault(); onDeltaButtonClick?.(+1);}} variant={"outline"} className="text-xs px-1 rounded-xl text-gray-400 hover:text-gray-500">+1%</Button>
                  <Button onClick={(e) => {e.preventDefault(); onDeltaButtonClick?.(+2);}} variant={"outline"} className="text-xs px-1 rounded-xl text-gray-400 hover:text-gray-500">+2%</Button>
                  <Button onClick={(e) => {e.preventDefault(); onDeltaButtonClick?.(+3);}} variant={"outline"} className="text-xs px-1 rounded-xl text-gray-400 hover:text-gray-500">+3%</Button>
                </div>}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
</div>)}