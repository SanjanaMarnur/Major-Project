"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CropHealthPage } from "@/components/crop/CropHealthPage";

export default function Home() {
  const router = useRouter();
  const [auth, setAuth] = useState<boolean | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("crop_auth")) {
      router.push("/login");
    } else {
      setAuth(true);
    }
  }, [router]);

  if (!auth) return null;

  return <CropHealthPage />;
}
