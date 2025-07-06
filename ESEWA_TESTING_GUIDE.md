# eSewa Payment Testing Guide

## 🧪 **Testing Without Real Credentials**

### **Option 1: Use eSewa Official Test Credentials**

eSewa provides test credentials for development:

**Test Environment:**
- **Product Code:** `EPAYTEST`
- **Secret Key:** `8gBm/:&EnhH.1/q`
- **URL:** `https://rc-epay.esewa.com.np/api/epay/main/v2/form`

**Test Card Details:**
- **Card Number:** `4242 4242 4242 4242`
- **Expiry:** Any future date
- **CVV:** Any 3 digits
- **OTP:** `123456`

### **Option 2: Create Mock Payment Flow**

For development without any eSewa integration:

1. **Frontend Mock:** Simulate payment flow in UI
2. **Backend Mock:** Return success/failure responses
3. **Database:** Store mock transaction records

### **Option 3: Use eSewa Sandbox (If Available)**

Some payment gateways offer sandbox environments.

## 🔧 **Implementation Steps**

### **Step 1: Test with eSewa Test Credentials**

1. **Save Test Credentials:**
   ```
   Product Code: EPAYTEST
   Secret Key: 8gBm/:&EnhH.1/q
   Environment: Test
   ```

2. **Test Payment Flow:**
   - Create an order
   - Select "Pay with eSewa"
   - Complete test payment
   - Verify success/failure handling

### **Step 2: Create Mock Payment System**

If you want to test without eSewa at all:

```python
# Mock payment response
def mock_esewa_payment(order_id, amount):
    return {
        'success': True,
        'transaction_id': f'mock_{order_id}_{int(time.time())}',
        'amount': amount,
        'status': 'COMPLETE'
    }
```

### **Step 3: Test Different Scenarios**

1. **Successful Payment**
2. **Failed Payment**
3. **Cancelled Payment**
4. **Network Errors**
5. **Invalid Credentials**

## 🛡️ **Security Considerations**

### **Test Environment Only:**
- Never use test credentials in production
- Test credentials are publicly known
- Real credentials must be kept secret

### **Data Protection:**
- Test data should be clearly marked
- Don't mix test and production data
- Use separate databases for testing

## 📋 **Testing Checklist**

### **Frontend Testing:**
- [ ] Credentials form validation
- [ ] Payment button visibility
- [ ] Loading states
- [ ] Error handling
- [ ] Success/failure pages

### **Backend Testing:**
- [ ] Credential validation
- [ ] Payment initiation
- [ ] Callback handling
- [ ] Database updates
- [ ] Audit logging

### **Integration Testing:**
- [ ] End-to-end payment flow
- [ ] Order status updates
- [ ] Email notifications
- [ ] Admin dashboard updates

## 🚀 **Getting Real Credentials**

When ready for production:

1. **Contact eSewa:** Apply for business account
2. **Provide Documents:** Business registration, bank details
3. **Get Credentials:** Product code and secret key
4. **Test in Production:** Use real credentials in test environment first

## 📞 **Support**

For testing issues:
- **Email:** qrmenu851@gmail.com
- **Documentation:** eSewa Developer Portal
- **Test Environment:** https://rc-epay.esewa.com.np 