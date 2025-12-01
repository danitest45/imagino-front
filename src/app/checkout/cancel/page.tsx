import Link from 'next/link';

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-[100dvh] mt-24 px-4 py-10 bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 text-gray-100 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Payment canceled or not completed. Please try again.</h1>
      <Link href="/pricing" className="text-purple-400 hover:underline">
        Back to plans
      </Link>
    </div>
  );
}

