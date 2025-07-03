import { useEffect } from "react";
import { useRouter } from "next/router";

const PaymentSuccess = () => {
  const router = useRouter();
  const { order_id, transaction_uuid, tableUid } = router.query;

  useEffect(() => {
    if (order_id && transaction_uuid && tableUid) {
      router.replace(`/menu/order-status/${order_id}?transaction_uuid=${transaction_uuid}&tableUid=${tableUid}`);
    }
  }, [order_id, transaction_uuid, tableUid, router]);

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