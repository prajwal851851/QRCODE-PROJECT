"use client";
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import CheckoutContent from "./CheckoutContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
