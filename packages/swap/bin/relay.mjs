import { createRelayNode } from "../dist/src/relay.js";
import * as PeerIdFactory from '@libp2p/peer-id-factory'
import fs from "fs";
import path from "path";
import { toString } from 'uint8arrays'

const TestPeerId = {
  "id": "12D3KooWNVCCbMtGc1SSPVdjyJDqC728RtWezvzyvEiFEn8zSbXH",
  "privKey": "CAESQGw0cyYF4yNj/bOnpGaMcsUZnQeZL7ytQD+99KejQPcIvD6fqTlyamj2FIYcD1TlQkg/R1FPGjEzgG7UpBLqaTw=",
  "pubKey": "CAESILw+n6k5cmpo9hSGHA9U5UJIP0dRTxoxM4Bu1KQS6mk8",
};

const PeerIdToObject = (peerId) => {
  return {
    id: peerId.toString(),
    privKey: peerId.privateKey != null ? toString(peerId.privateKey, 'base64pad') : "",
    pubKey: peerId.publicKey != null ? toString(peerId.publicKey, 'base64pad') : "",
  }
}

const getPeerIdFromFs = async () => {
  try {
    const data = fs.readFileSync(path.join(import.meta.dirname, "relay-peer-id.json"));
    return PeerIdFactory.createFromJSON(JSON.parse(data));
  } catch {}
}

const peerId = process.env.TEST ? await PeerIdFactory.createFromJSON(TestPeerId) : await getPeerIdFromFs();
const port = 33333;

const relayNode = await createRelayNode(peerId, port);

fs.writeFileSync(path.join(import.meta.dirname, "relay-peer-id.json"), JSON.stringify(PeerIdToObject(relayNode.peerId), null, 2));

console.log(`Relay started at\n${relayNode.getMultiaddrs().map(address => address.toString()).join("\n")}`);
