export const RelayMultiaddrs = [
  // "/ip4/127.0.0.1/tcp/33333/ws/p2p/12D3KooWNVCCbMtGc1SSPVdjyJDqC728RtWezvzyvEiFEn8zSbXH",
  // "/ip4/192.168.0.15/tcp/33333/ws/p2p/12D3KooWNVCCbMtGc1SSPVdjyJDqC728RtWezvzyvEiFEn8zSbXH",
  // "/ip4/192.168.64.1/tcp/33333/ws/p2p/12D3KooWNVCCbMtGc1SSPVdjyJDqC728RtWezvzyvEiFEn8zSbXH",
  // "/ip4/10.6.0.2/tcp/33333/ws/p2p/12D3KooWNVCCbMtGc1SSPVdjyJDqC728RtWezvzyvEiFEn8zSbXH",
  "/dns4/axe-relay.pat.mn/tcp/443/wss/p2p/12D3KooWNNtP4zGRwDLG9j6n7MCcuzbThJvBTSuywJC1gmWcNfmj",
]

export const PeerIdToRelayMultiaddrs = (peerId: string) => {
  return RelayMultiaddrs.map((multiaddr) => `${multiaddr}/p2p-circuit/p2p/${peerId}`);
}
