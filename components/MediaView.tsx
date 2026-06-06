import { isVideoUrl } from "@/lib/utils";

/**
 * Renders post/workout media — an image or, for video URLs, an autoplaying
 * muted loop (Reels-style). `controls` enables the video scrubber for non-reel
 * surfaces.
 */
export function MediaView({
  url,
  className,
  controls = false,
}: {
  url: string;
  className?: string;
  controls?: boolean;
}) {
  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        className={className}
        autoPlay
        loop
        muted
        playsInline
        controls={controls}
        preload="metadata"
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={className} />;
}
