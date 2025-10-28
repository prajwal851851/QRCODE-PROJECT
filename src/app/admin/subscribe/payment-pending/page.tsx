'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function PaymentPendingPage() {
  const router = useRouter();
  const [timer, setTimer] = useState(0);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentSubmittedAt, setPaymentSubmittedAt] = useState<string | null>(null);
  const [paymentSubmittedAtFormatted, setPaymentSubmittedAtFormatted] = useState<string | null>(null);

  // Fetch payment info from backend
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      const token = localStorage.getItem('adminAccessToken');
      const txnId = localStorage.getItem('lastManualTransactionId');
      setTransactionId(txnId);
      if (!token || !txnId) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/billing/payment/history/?transaction_id=${txnId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.payment_submitted_at) {
            setPaymentSubmittedAt(data.payment_submitted_at);
            setPaymentSubmittedAtFormatted(data.payment_submitted_at_formatted || null);
          }
        }
      } catch (e) {
        // ignore
      }
    };
    fetchPaymentInfo();
  }, []);

  // Start timer based on paymentSubmittedAt
  useEffect(() => {
    if (!paymentSubmittedAt) return;
    const submittedTime = new Date(paymentSubmittedAt).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setTimer(Math.floor((now - submittedTime) / 1000));
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [paymentSubmittedAt]);

  // Block navigation (no sidebar, no dashboard link)
  useEffect(() => {
    const block = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', block);
    return () => window.removeEventListener('beforeunload', block);
  }, []);

  // Optionally, poll backend to check if subscription is active and redirect
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = localStorage.getItem('adminAccessToken');
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/billing/subscription/access/`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.has_access) {
          toast.success('Your payment has been verified! Redirecting...');
          router.push('/admin/dashboard');
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [router]);

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-950">
      <div className="bg-white dark:bg-gray-800 border border-orange-200 dark:border-gray-700 rounded-lg p-8 max-w-md w-full shadow-lg text-center">
        <h2 className="text-2xl font-bold text-orange-800 dark:text-orange-300 mb-4">Payment Pending Verification</h2>
        <p className="mb-2 text-gray-700 dark:text-gray-200">Your payment is being verified. You will get access once it is approved by the admin.</p>
        {transactionId && (
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">Transaction ID: <span className="font-mono">{transactionId}</span></div>
        )}
        {paymentSubmittedAtFormatted && (
          <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">Payment Date: <span className="font-mono">{paymentSubmittedAtFormatted}</span></div>
        )}
        {paymentSubmittedAt ? (
          <div className="mb-4 text-lg font-semibold text-orange-700 dark:text-orange-200">Time since payment: {formatTime(timer)}</div>
        ) : (
          <div className="mb-4 text-lg font-semibold text-orange-700 dark:text-orange-200">Waiting for payment info...</div>
        )}
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">If you made a mistake, please contact support.<br/>You cannot close this page until your payment is approved.</div>
        <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">Need help? Call/WhatsApp: <a href="tel:+9779843361311" className="text-green-600 dark:text-green-400 font-semibold">+977 9843361311</a></div>
      </div>
    </div>
  );
} 