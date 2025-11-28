'use client';
import { useState } from 'react';
import { resendVerification } from '../lib/api';
import { toast } from '../lib/toast';
import { Problem, mapProblemToUI } from '../lib/errors';

interface Props {
  open: boolean;
  email: string | null;
  onClose: () => void;
}

export default function ResendVerificationDialog({ open, email, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  if (!open) return null;

  async function handleResend() {
    if (!email) return;
    setLoading(true);
    try {
      await resendVerification(email);
      toast('Verification link resent.');
      onClose();
    } catch (err) {
      const action = mapProblemToUI(err as Problem);
      toast(action.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-gray-800 p-6 rounded-xl max-w-sm w-full text-center">
        <h2 className="text-lg font-semibold text-white mb-2">Confirm your email</h2>
        <p className="text-gray-300 text-sm mb-4">
          We sent a link to {email}. Didn&apos;t get it?
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleResend}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 rounded text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Resend'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded text-white hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
