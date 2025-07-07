# Quick Testing Guide for eSewa Integration

## 🚀 **Production Setup Guide**

### **Step 1: Configure eSewa Credentials**

1. **Get Real eSewa Business Account:**
   - Sign up for eSewa business account at https://esewa.com.np
   - Complete business verification process
   - Get your production credentials

2. **Configure in Admin Panel:**
   - Go to Admin Panel → eSewa Integration
   - Set Environment to "Production"
   - Enter your real eSewa Product Code (starts with EPAY)
   - Enter your real eSewa Secret Key
   - Save and enable the configuration

### **Step 2: Test Payment Flow**

1. **Create Test Order:**
   - Scan QR code or access menu
   - Add items to cart
   - Proceed to checkout

2. **Complete Payment:**
   - Select "Pay with eSewa"
   - Complete payment on eSewa dashboard
   - Verify successful redirect

3. **Verify Transaction:**
   - Check order status
   - Verify payment in admin panel
   - Confirm money received in eSewa account

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **"eSewa not configured" error:**
   - Ensure eSewa credentials are saved and enabled
   - Check that environment is set to "Production"

2. **Payment not completing:**
   - Verify eSewa credentials are correct
   - Check internet connection
   - Ensure eSewa account is active

3. **Wrong admin receiving payment:**
   - Verify table admin assignments
   - Check eSewa credentials for correct admin

### **Testing Checklist:**

- [ ] eSewa credentials configured
- [ ] Environment set to "Production"
- [ ] eSewa integration enabled
- [ ] Table admin assignments correct
- [ ] Payment flow working
- [ ] Success/failure redirects working
- [ ] Transaction records created
- [ ] Money received in eSewa account

## 📞 **Support**

If you encounter issues:
- Check admin panel for error messages
- Verify eSewa account status
- Contact support at qrmenu851@gmail.com

## ⚠️ **Important Notes**

- **Production environment processes real money**
- **Test thoroughly before going live**
- **Keep eSewa credentials secure**
- **Monitor transactions regularly** 