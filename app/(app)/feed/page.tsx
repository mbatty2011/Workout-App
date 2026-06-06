import { redirect } from "next/navigation";
import { FEATURES } from "@/config/features";
import { getFeed, getExploreFeed } from "@/modules/social/queries";
import { ReelsFeed } from "@/modules/social/components/ReelsFeed";

export default async function FeedPage() {
  if (!FEATURES.socialFeed) redirect("/");
  const [following, explore] = await Promise.all([getFeed(40), getExploreFeed(40)]);

  return <ReelsFeed following={following} explore={explore} />;
}
