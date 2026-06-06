"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteFoodLog } from "@/modules/food/actions";

export function DeleteLogButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await deleteFoodLog(id);
          router.refresh();
        })
      }
      className="text-muted active:scale-90"
      aria-label="Remove food log"
    >
      ✕
    </button>
  );
}
