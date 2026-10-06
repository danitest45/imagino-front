import { notFound } from "next/navigation";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Design review",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function DesignReviewPage() {
  const allowed =
    process.env.NODE_ENV === "development" ||
    (process.env.VERCEL_ENV === "preview" &&
      process.env.ENABLE_DESIGN_REVIEW === "true");
  if (!allowed) notFound();
  const { default: DesignReview } = await import("./DesignReview");
  return <DesignReview />;
}
