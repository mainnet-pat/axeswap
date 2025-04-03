"use client";

import { Crumbs } from '@/components/Crumbs';
import { RpcSelect } from '@/components/RpcSelect';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Endpoints, GetDefaultBchRpcEndpoint, GetDefaultMoneroRpcEndpoint, SetDefaultBchRpcEndpoint, SetDefaultMoneroRpcEndpoint } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import { toast } from "sonner";

export default function SettingsPage() {
  const [network, setNetwork] = useState('mainnet');
  const [defaultMoneroRpcEndpoint, setDefaultMoneroRpcEndpoint] = useState('');
  const [defaultBchRpcEndpoint, setDefaultBchRpcEndpoint] = useState('');

  useEffect(() => {
    // Load the endpoints from local storage
    setDefaultMoneroRpcEndpoint(GetDefaultMoneroRpcEndpoint(network) || Endpoints[network].monero[0]);
    setDefaultBchRpcEndpoint(GetDefaultBchRpcEndpoint(network) || Endpoints[network].bch[0]);
  }, [network]);

  const handleSave = useCallback(() => {
    SetDefaultMoneroRpcEndpoint(network, defaultMoneroRpcEndpoint)
    SetDefaultBchRpcEndpoint(network, defaultBchRpcEndpoint);
    toast.success("Settings saved");
  }, [network, defaultBchRpcEndpoint, defaultMoneroRpcEndpoint]);

  return (
    <>
      <Crumbs value={[
        { href: "/settings", title: "Settings", collapsible: false },
      ]} />
      <div className='w-auto mx-auto flex flex-col gap-3 my-10'>
        <Tabs defaultValue="mainnet" value={network} onValueChange={(value) => setNetwork(value)} className="w-[360px] mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mainnet">Mainnet</TabsTrigger>
            <TabsTrigger value="testnet">Testnet</TabsTrigger>
            <TabsTrigger value="regtest">Regtest</TabsTrigger>
          </TabsList>
          <TabsContent value={network}>
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>
                  Make changes to your account here. Click save when you&apos;re done.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 flex flex-col gap-3">
                <RpcSelect label='Default Monero RPC Endpoint:' coin={"monero"} network={network} value={defaultMoneroRpcEndpoint} onValueChange={setDefaultMoneroRpcEndpoint} />
                <RpcSelect label='Default BCH RPC Endpoint:' coin={"bch"} network={network} value={defaultBchRpcEndpoint} onValueChange={setDefaultBchRpcEndpoint} />
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave}>Save changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};
