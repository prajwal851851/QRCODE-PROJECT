# 🧪 Quick Testing Guide - eSewa Payment Flow

## **Option 1: Use eSewa Test Credentials (Recommended)**

### **Step 1: Save Test Credentials**
1. Go to Admin Dashboard → Integrate eSewa
2. Enter these **test credentials**:
   ```
   Product Code: EPAYTEST
   Secret Key: 8gBm/:&EnhH.1/q
   Account Name: Test Restaurant
   Environment: Test
   ```
3. Click "Save Credentials"

### **Step 2: Test Payment Flow**
1. Go to Menu page (scan QR code or visit `/table/[id]`)
2. Add items to cart
3. Click "Pay with eSewa"
4. You'll be redirected to eSewa test environment
5. Use test card: `4242 4242 4242 4242`
6. Complete payment

---

## **Option 2: Use Mock Payment System (No eSewa Required)**

### **Step 1: Enable Testing Mode**
1. Go to Admin Dashboard → Integrate eSewa
2. Check "Enable Testing Mode"
3. Save any dummy credentials (validation will be bypassed)

### **Step 2: Test Mock Payment**
1. Go to Menu page
2. Add items to cart
3. Click "Pay with eSewa"
4. You'll see a **Mock Payment Interface**
5. Choose:
   - ✅ **Successful Payment**
   - ❌ **Failed Payment** 
   - ⚠️ **Cancelled Payment**

---

## **Option 3: Test Different Scenarios**

### **Test 1: Successful Payment Flow**
1. Complete payment successfully
2. Verify order status updates
3. Check admin dashboard
4. Verify email notifications

### **Test 2: Failed Payment Flow**
1. Simulate payment failure
2. Verify error handling
3. Check order status
4. Test retry functionality

### **Test 3: Cancelled Payment Flow**
1. Cancel payment
2. Verify return to menu
3. Check cart state
4. Test re-payment

---

## **🔧 Backend Testing**

### **Test Credential Validation**
```bash
# Test with valid credentials
curl -X POST http://localhost:8000/api/admin/credentials/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "product_code": "EPAYTEST",
    "secret_key": "8gBm/:&EnhH.1/q"
  }'

# Test with invalid credentials
curl -X POST http://localhost:8000/api/admin/credentials/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "product_code": "INVALID",
    "secret_key": "wrong"
  }'
```

### **Test Payment Status**
```bash
# Check if credentials are configured
curl http://localhost:8000/api/admin/credentials/status/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## **📱 Frontend Testing**

### **Test Credential Management**
1. ✅ Save valid credentials
2. ❌ Try to save invalid credentials
3. 🔍 View masked credentials
4. 🔐 Verify with password + OTP
5. 🗑️ Clear credentials

### **Test Payment UI**
1. ✅ Show "Pay with eSewa" when configured
2. ❌ Hide "Pay with eSewa" when not configured
3. 🔄 Loading states
4. ⚠️ Error handling
5. ✅ Success/failure pages

---

## **🚀 Production Testing**

When you get real eSewa credentials:

1. **Update Credentials:**
   ```
   Product Code: YOUR_REAL_PRODUCT_CODE
   Secret Key: YOUR_REAL_SECRET_KEY
   Environment: Production
   ```

2. **Test in Production:**
   - Use real eSewa environment
   - Test with small amounts first
   - Verify merchant name display
   - Check payment routing

---

## **📞 Support**

- **Email:** qrmenu851@gmail.com
- **Test Environment:** https://rc-epay.esewa.com.np
- **Documentation:** eSewa Developer Portal

---

## **✅ Testing Checklist**

- [ ] Credential validation works
- [ ] Payment initiation works
- [ ] Success callback works
- [ ] Failure callback works
- [ ] Order status updates
- [ ] Admin dashboard updates
- [ ] Email notifications work
- [ ] Error handling works
- [ ] Loading states work
- [ ] Mobile responsiveness 