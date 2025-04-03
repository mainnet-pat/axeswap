"use client";

import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full mx-auto mt-20 max-w-[95%] md:max-w-[85%]">
      <Image src={"/logo-white.png"} alt="Logo" width={320} height={320} className="w-[320px] h-[320px]" />
      <h1 className="text-2xl font-bold text-center mt-4">Atomic Cross-Chain Exchange</h1>
    </div>
  );
}
