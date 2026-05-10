import { Suspense } from "react";
import { PostDetailsClient } from "@/components/posts/PostDetailPage";

export default function PostDetailsPage() {
  return (
    <Suspense fallback={<div>Loading thread...</div>}>
      <PostDetailsClient />
    </Suspense>
  );
}
