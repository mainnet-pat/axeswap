import { defineCustomElements } from '@bitjson/qr-code';
import { useEffect } from 'react';

export function QrCode({address, iconSrc, amount}: {address: string, iconSrc: string, amount: string}) {
  useEffect(() => {defineCustomElements(window)}, []);

  return <>
    <a href={address.includes(":") ? `${address}?amount=${amount}` : `monero:${address}?tx_amount=${amount}`} target="_blank" rel="noopener noreferrer">
      { /* @ts-expect-error error */ }
      <qr-code
        contents={address as any}
        style={{ width: "260px", height: "260px", margin: "5px auto 0 auto", backgroundColor: "#fff" }}>
          <img src={iconSrc} alt="qr-code" title={address} width={96} height={96} slot="icon" />
      { /* @ts-expect-error error */ }
      </qr-code>
    </a>
  </>
}
