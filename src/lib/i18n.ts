import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Get saved language from localStorage if available
const getSavedLanguage = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('language');
    return saved || 'en';
  }
  return 'en';
};

// Initialize i18n
const initI18n = () => {
  const savedLanguage = getSavedLanguage();
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          "Dashboard": "Dashboard",
            "Dashboard Overview": "Dashboard Overview",
          "Total Revenue": "Total Revenue",
          "Total Orders": "Total Orders",
          "Total Customers": "Total Customers",
            "Customers": "Customers",
          "Active Tables": "Active Tables",
          "Inactive Tables": "Inactive Tables",
          "Average Order Value": "Average Order Value",
          "Table Occupancy Rate": "Table Occupancy Rate",
          "Export": "Export",
            "Export Data": "Export Data",
          "Apply Filter": "Apply Filter",
          "Clear Filter": "Clear Filter",
            "Filter by Date Range": "Filter by Date Range",
            "Showing data from": "Showing data from",
            "to": "to",
          "Reviews": "Reviews",
            "See Reviews": "See Reviews",
            "Customer Reviews": "Customer Reviews",
          "Delete Review": "Delete Review",
          "Are you sure you want to delete this review?": "Are you sure you want to delete this review?",
          "Delete": "Delete",
            "Delete All": "Delete All",
          "Cancel": "Cancel",
          "Settings": "Settings",
          "Customize your application experience.": "Customize your application experience.",
          "Appearance": "Appearance",
          "Light": "Light",
          "Dark": "Dark",
          "System": "System",
          "Notifications": "Notifications",
          "Enable or disable notifications": "Enable or disable notifications",
          "Language": "Language",
            "Select your preferred language": "Select your preferred language",
            "All time": "All time",
            "Recent Orders": "Recent Orders",
            "Showing the last 5 orders": "Showing the last 5 orders",
            "Table": "Table",
            "No recent orders.": "No recent orders.",
            "Peak Hours Analysis": "Peak Hours Analysis",
            "Top 3 Busiest Hours": "Top 3 Busiest Hours",
            "Top 3 Busiest Days": "Top 3 Busiest Days",
            "orders": "orders",
            "Average Prep Time": "Average Prep Time",
            "per order": "per order",
            "Pending Actions": "Pending Actions",
            "Reviews Statistics": "Reviews Statistics",
            "Total Reviews": "Total Reviews",
            "Average Rating": "Average Rating",
            "Positive Reviews (4-5★)": "Positive Reviews (4-5★)",
            "Negative Reviews (1-2★)": "Negative Reviews (1-2★)",
            "No feedback data available": "No feedback data available",
            "Loading reviews...": "Loading reviews...",
            "Order #": "Order #",
            "Anonymous": "Anonymous",
            "No reviews yet": "No reviews yet",
            "Waiter Call Notification": "Waiter Call Notification",
            "is calling for a waiter": "is calling for a waiter",
            "Resolve": "Resolve",
            "Based on": "Based on",
            "Approximate": "Approximate",
            "Close": "Close",
            "No order data available yet": "No order data available yet"
        }
      },
      ne: {
        translation: {
          "Dashboard": "ड्यासबोर्ड",
            "Dashboard Overview": "ड्यासबोर्ड अवलोकन",
          "Total Revenue": "कुल आम्दानी",
          "Total Orders": "कुल अर्डर",
          "Total Customers": "कुल ग्राहक",
            "Customers": "ग्राहकहरू",
          "Active Tables": "सक्रिय टेबलहरू",
          "Inactive Tables": "निष्क्रिय टेबलहरू",
          "Average Order Value": "औसत अर्डर मूल्य",
          "Table Occupancy Rate": "टेबल ओक्युपेन्सी दर",
          "Export": "निर्यात गर्नुहोस्",
            "Export Data": "डाटा निर्यात गर्नुहोस्",
          "Apply Filter": "फिल्टर लागू गर्नुहोस्",
          "Clear Filter": "फिल्टर हटाउनुहोस्",
            "Filter by Date Range": "मिति दायरा अनुसार फिल्टर गर्नुहोस्",
            "Showing data from": "यहाँबाट डाटा देखाइरहेको छ",
            "to": "सम्म",
          "Reviews": "समीक्षाहरू",
            "See Reviews": "समीक्षाहरू हेर्नुहोस्",
            "Customer Reviews": "ग्राहक समीक्षाहरू",
          "Delete Review": "समीक्षा हटाउनुहोस्",
          "Are you sure you want to delete this review?": "के तपाईं यो समीक्षा हटाउन निश्चित हुनुहुन्छ?",
          "Delete": "हटाउनुहोस्",
            "Delete All": "सबै हटाउनुहोस्",
          "Cancel": "रद्द गर्नुहोस्",
          "Settings": "सेटिङहरू",
          "Customize your application experience.": "आफ्नो अनुप्रयोग अनुभव अनुकूलन गर्नुहोस्।",
          "Appearance": "रूप",
          "Light": "हल्का",
          "Dark": "गाढा",
          "System": "प्रणाली",
          "Notifications": "सूचनाहरू",
          "Enable or disable notifications": "सूचनाहरू सक्षम वा अक्षम गर्नुहोस्",
          "Language": "भाषा",
            "Select your preferred language": "आफ्नो मनपर्ने भाषा चयन गर्नुहोस्",
            "All time": "सबै समय",
            "Recent Orders": "हालैका अर्डरहरू",
            "Showing the last 5 orders": "पछिल्ला ५ अर्डरहरू देखाइरहेको छ",
            "Table": "टेबल",
            "No recent orders.": "हालैका अर्डरहरू छैनन्।",
            "Peak Hours Analysis": "चरम घण्टा विश्लेषण",
            "Top 3 Busiest Hours": "शीर्ष ३ व्यस्त घण्टाहरू",
            "Top 3 Busiest Days": "शीर्ष ३ व्यस्त दिनहरू",
            "orders": "अर्डरहरू",
            "Average Prep Time": "औसत तयारी समय",
            "per order": "प्रति अर्डर",
            "Pending Actions": "पेन्डिङ कार्यहरू",
            "Reviews Statistics": "समीक्षा तथ्यांक",
            "Total Reviews": "कुल समीक्षाहरू",
            "Average Rating": "औसत मूल्यांकन",
            "Positive Reviews (4-5★)": "सकारात्मक समीक्षाहरू (४-५★)",
            "Negative Reviews (1-2★)": "नकारात्मक समीक्षाहरू (१-२★)",
            "No feedback data available": "प्रतिक्रिया डाटा उपलब्ध छैन",
            "Loading reviews...": "समीक्षाहरू लोड गर्दै...",
            "Order #": "अर्डर #",
            "Anonymous": "अज्ञात",
            "No reviews yet": "अहिलेसम्म कुनै समीक्षा छैन",
            "Waiter Call Notification": "वेटर कल सूचना",
            "is calling for a waiter": "वेटरको लागि कल गर्दैछ",
            "Resolve": "समाधान गर्नुहोस्",
            "Based on": "आधारमा",
            "Approximate": "अनुमानित",
            "Close": "बन्द गर्नुहोस्",
            "No order data available yet": "कुनै ऑर्डर डाटा उपलब्ध छैन"
          }
        },
        hi: {
          translation: {
            "Dashboard": "डैशबोर्ड",
            "Dashboard Overview": "डैशबोर्ड अवलोकन",
            "Total Revenue": "कुल राजस्व",
            "Total Orders": "कुल ऑर्डर",
            "Total Customers": "कुल ग्राहक",
            "Customers": "ग्राहक",
            "Active Tables": "सक्रिय टेबल",
            "Inactive Tables": "निष्क्रिय टेबल",
            "Average Order Value": "औसत ऑर्डर मूल्य",
            "Table Occupancy Rate": "टेबल अधिभोग दर",
            "Export": "निर्यात",
            "Export Data": "डेटा निर्यात करें",
            "Apply Filter": "फ़िल्टर लागू करें",
            "Clear Filter": "फ़िल्टर साफ़ करें",
            "Filter by Date Range": "दिनांक सीमा द्वारा फ़िल्टर करें",
            "Showing data from": "से डेटा दिखा रहा है",
            "to": "तक",
            "Reviews": "समीक्षाएं",
            "See Reviews": "समीक्षाएं देखें",
            "Customer Reviews": "ग्राहक समीक्षाएं",
            "Delete Review": "समीक्षा हटाएं",
            "Are you sure you want to delete this review?": "क्या आप वाकई इस समीक्षा को हटाना चाहते हैं?",
            "Delete": "हटाएं",
            "Delete All": "सभी हटाएं",
            "Cancel": "रद्द करें",
            "Settings": "सेटिंग्स",
            "Customize your application experience.": "अपने अनुप्रयोग अनुभव को अनुकूलित करें।",
            "Appearance": "दिखावट",
            "Light": "हल्का",
            "Dark": "गहरा",
            "System": "सिस्टम",
            "Notifications": "सूचनाएं",
            "Enable or disable notifications": "सूचनाएं सक्षम या अक्षम करें",
            "Language": "भाषा",
            "Select your preferred language": "अपनी पसंदीदा भाषा चुनें",
            "All time": "सभी समय",
            "Recent Orders": "हाल के ऑर्डर",
            "Showing the last 5 orders": "पिछले 5 ऑर्डर दिखा रहा है",
            "Table": "टेबल",
            "No recent orders.": "कोई हाल का ऑर्डर नहीं।",
            "Peak Hours Analysis": "पीक आवर्स विश्लेषण",
            "Top 3 Busiest Hours": "शीर्ष 3 व्यस्त घंटे",
            "Top 3 Busiest Days": "शीर्ष 3 व्यस्त दिन",
            "orders": "ऑर्डर",
            "Average Prep Time": "औसत तैयारी समय",
            "per order": "प्रति ऑर्डर",
            "Pending Actions": "लंबित कार्य",
            "Reviews Statistics": "समीक्षा आंकड़े",
            "Total Reviews": "कुल समीक्षाएं",
            "Average Rating": "औसत रेटिंग",
            "Positive Reviews (4-5★)": "सकारात्मक समीक्षाएं (4-5★)",
            "Negative Reviews (1-2★)": "नकारात्मक समीक्षाएं (1-2★)",
            "No feedback data available": "कोई प्रतिक्रिया डेटा उपलब्ध नहीं",
            "Loading reviews...": "समीक्षाएं लोड हो रही हैं...",
            "Order #": "ऑर्डर #",
            "Anonymous": "अज्ञात",
            "No reviews yet": "अभी तक कोई समीक्षा नहीं",
            "Waiter Call Notification": "वेटर कॉल सूचना",
            "is calling for a waiter": "वेटर के लिए कॉल कर रहा है",
            "Resolve": "समाधान करें",
            "Based on": "के आधार पर",
            "Approximate": "अनुमानित",
            "Close": "बंद करें",
            "No order data available yet": "कुनै ऑर्डर डाटा उपलब्ध छैन"
          }
        }
      },
      lng: savedLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'language'
      }
    }).then(() => {
      // Double-check and set the language if needed (only on client side)
      if (typeof window !== 'undefined') {
        const currentSavedLanguage = localStorage.getItem('language');
        if (currentSavedLanguage && currentSavedLanguage !== i18n.language) {
          i18n.changeLanguage(currentSavedLanguage);
        }
      }
    });
  return i18n;
};

// Initialize i18n
const i18nInstance = initI18n();

// Make i18n globally accessible for debugging
if (typeof window !== 'undefined') {
  (window as any).i18n = i18nInstance;
}

export default i18nInstance; 