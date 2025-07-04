export const dynamic = "force-dynamic";

'use client'

import { Suspense } from "react";
import EsewaSuccessContent from "./EsewaSuccessContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EsewaSuccessContent />
    </Suspense>
  );
} 