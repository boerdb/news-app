"use client";

import { useEffect } from "react";
import { markArticlesSeen } from "@/lib/seen-articles";

type Props = {
  articleIds: string[];
};

export function SeenArticlesMarker({ articleIds }: Props) {
  useEffect(() => {
    markArticlesSeen(articleIds);
  }, [articleIds]);

  return null;
}
