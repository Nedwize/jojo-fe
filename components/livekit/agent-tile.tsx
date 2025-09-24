import { type AgentState, BarVisualizer, type TrackReference } from '@livekit/components-react';
import { cn } from '@/lib/utils';

interface AgentAudioTileProps {
  state: AgentState;
  audioTrack: TrackReference;
  className?: string;
}

export const AgentTile = ({
  state,
  audioTrack,
  className,
  ref,
}: React.ComponentProps<'div'> & AgentAudioTileProps) => {
  // Only show visualization when agent is speaking
  const isAgentSpeaking = state === 'speaking';

  return (
    <div ref={ref} className={cn('flex min-h-[40px] items-center justify-center', className)}>
      {isAgentSpeaking && (
        <BarVisualizer
          barCount={4}
          state={state}
          options={{ minHeight: 3 }}
          trackRef={audioTrack}
          className="flex h-8 w-20 items-center justify-center gap-0.5"
        >
          <span
            className={cn([
              'bg-muted min-h-2 w-1 rounded-full',
              'origin-center transition-colors duration-250 ease-linear',
              'data-[lk-highlighted=true]:bg-foreground data-[lk-muted=true]:bg-muted',
            ])}
          />
        </BarVisualizer>
      )}
    </div>
  );
};
