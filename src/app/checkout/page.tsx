export const dynamic = "force-dynamic";

"use client"

import { Suspense } from "react";
import CheckoutContent from "./CheckoutContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
