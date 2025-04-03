import { cn, Endpoints } from "@/lib/utils";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger } from "./ui/select";

export function RpcSelect({label, placeholder, coin, network, value, onValueChange, className} : {label?: string, placeholder?: string, coin: "bch" | "monero", network: string, value?: string, onValueChange?: (value: string) => void, className?: string}) {
  const coinName = coin === 'monero' ? 'Monero' : 'BCH';
  return <Label className={cn('flex flex-col gap-2', className)}>
    {label && <div>Default Monero RPC Endpoint:</div>}
    <div className='flex flex-row gap-2'>
      <Input
        placeholder={placeholder}
        className='flex-1 text-sm'
        type="text"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
      />
      <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger className='w-[40px]'>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{`${coinName} ${network} RPCs`}</SelectLabel>
            {Endpoints[network]?.[coin]?.map((endpoint) => (
              <SelectItem key={endpoint} value={endpoint}>{endpoint}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  </Label>
}