import { useWindowDimensions, View } from 'react-native';
import YoutubePlayer, { PLAYER_STATES } from 'react-native-youtube-iframe';

export type YouTubeViewProps = {
  videoId: string;
  onEnded: () => void;
  onError?: (message: string) => void;
  /** Max width of the player; height follows 16:9. */
  maxWidth?: number;
};

/** YouTube's official embedded player (iOS/Android, via WebView). The video must stay visible. */
export function YouTubeView({ videoId, onEnded, onError, maxWidth = 720 }: YouTubeViewProps) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(screenWidth, maxWidth);
  return (
    <View style={{ width, height: (width * 9) / 16, backgroundColor: '#000' }}>
      <YoutubePlayer
        key={videoId}
        videoId={videoId}
        width={width}
        height={(width * 9) / 16}
        play
        forceAndroidAutoplay
        initialPlayerParams={{ rel: false }}
        onChangeState={(state: string) => state === PLAYER_STATES.ENDED && onEnded()}
        onError={(e: string) => onError?.(e === 'embed_not_allowed' ? 'The owner doesn’t allow this video to play in other apps.' : 'This video can’t be played.')}
      />
    </View>
  );
}
