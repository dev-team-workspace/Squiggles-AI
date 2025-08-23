'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function BuyCredits({ priceId }: { priceId: string }) {
  const { data: session } = useSession();
  const router = useRouter();

  const handlePurchase = async () => {
    const res = await fetch('/api/checkout-session', {
      method: 'POST',
      body: JSON.stringify({
        priceId,
        userId: session?.user?.id,
      }),
    });

    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert('Failed to start payment.');
    }
  };

  return <button onClick={handlePurchase}>Buy Credits</button>;
}
