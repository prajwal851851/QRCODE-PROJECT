
/*my name is prajwal*/

'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const PaymentSuccess = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Helper to robustly parse all params even if there are two question marks
  const getAllParams = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    let params = new URLSearchParams();
    if (url.includes('?')) {
      // Split on first '?' and then parse the rest as one string
      const queryString = url.split('?').slice(1).join('?');
      // Replace any '?data=' with '&data=' to simulate proper param joining
      const fixedQuery = queryString.replace(/\?data=/, '&data=');
      params = new URLSearchParams(fixedQuery);
    }
    return {
      data: params.get('data'),
      transaction_uuid: params.get('transaction_uuid'),
      order_id: params.get('order_id'),
    };
  };

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const { data, transaction_uuid, order_id } = getAllParams();
        if (!data || !transaction_uuid) {
          console.error('Missing payment data');
          // If order_id is present, redirect to order status anyway
          if (order_id) {
            router.push(`/menu/order-status/${order_id}`);
            return;
          }
          router.push('/menu');
          return;
        }

        // Verify payment with backend
        const response = await axios.get(`${API_BASE_URL}/api/esewa/verify/`, {
          params: {
            data,
            transaction_uuid
          }
        });

        if (response.data.order_id) {
          // Redirect to order status page
          router.push(`/menu/order-status/${response.data.order_id}`);
        } else if (order_id) {
          // Fallback: use order_id from URL if backend did not return it
          router.push(`/menu/order-status/${order_id}`);
        } else {
          console.error('No order ID received');
          router.push('/menu');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        router.push('/menu');
      }
    };

    verifyPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Processing Payment...</h1>
        <p>Please wait while we verify your payment.</p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
