import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const handleEsewaPayment = async (params: {
  totalAmount: number;
  taxAmount: number;
  serviceCharge: number;
  deliveryCharge: number;
  orderId: string;
  setError: (msg: string) => void;
}) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/esewa/initiate/`, {
      amount: params.totalAmount,
      tax_amount: params.taxAmount,
      product_service_charge: params.serviceCharge,
      product_delivery_charge: params.deliveryCharge,
      orderId: params.orderId
    });
    if (response.data) {
      // Create form and submit to eSewa
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = response.data.payment_url;

      // Add all payment data as hidden fields
      Object.entries(response.data).forEach(([key, value]) => {
        if (key !== 'payment_url') {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        }
      });

      document.body.appendChild(form);
      form.submit();
    }
  } catch (error) {
    console.error('Error initiating eSewa payment:', error);
    params.setError('Failed to initiate payment. Please try again.');
  }
};