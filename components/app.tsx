'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { motion } from 'motion/react';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import { toastAlert } from '@/components/alert-toast';
import { SessionView } from '@/components/session-view';
import { Toaster } from '@/components/ui/sonner';
import { Welcome } from '@/components/welcome';
import useConnectionDetails from '@/hooks/useConnectionDetails';
import { type AuthData, type LiveKitSessionData, createLiveKitSession } from '@/lib/auth';
import { PushToTalkManager } from '@/lib/push-to-talk';
import type { AppConfig } from '@/lib/types';

const MotionWelcome = motion.create(Welcome);
const MotionSessionView = motion.create(SessionView);

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const room = useMemo(() => new Room(), []);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [liveKitSession, setLiveKitSession] = useState<LiveKitSessionData | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [pushToTalkManager, setPushToTalkManager] = useState<PushToTalkManager | null>(null);
  const [isPushToTalkActive, setIsPushToTalkActive] = useState(false);
  const { refreshConnectionDetails } = useConnectionDetails(userId);

  useEffect(() => {
    const onDisconnected = () => {
      setSessionStarted(false);
      refreshConnectionDetails();
    };
    const onMediaDevicesError = (error: Error) => {
      toastAlert({
        title: 'Encountered an error with your media devices',
        description: `${error.name}: ${error.message}`,
      });
    };
    room.on(RoomEvent.MediaDevicesError, onMediaDevicesError);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.MediaDevicesError, onMediaDevicesError);
    };
  }, [room, refreshConnectionDetails]);

  useEffect(() => {
    if (sessionStarted && room.state === 'disconnected' && liveKitSession) {
      console.log('Connecting to LiveKit room:', liveKitSession.room);
      Promise.all([
        room.localParticipant.setMicrophoneEnabled(false, undefined, {
          preConnectBuffer: appConfig.isPreConnectBufferEnabled,
        }),
        room.connect(liveKitSession.roomUrl, liveKitSession.token),
      ]).then(() => {
        // Initialize PushToTalkManager after successful connection
        const pttManager = new PushToTalkManager(room);
        setPushToTalkManager(pttManager);
        console.log('✅ PushToTalkManager initialized');
      }).catch((error) => {
        console.error('LiveKit connection error:', error);
        toastAlert({
          title: 'There was an error connecting to the agent',
          description: `${error.name}: ${error.message}`,
        });
      });
    }
    return () => {
      setPushToTalkManager(null);
      room.disconnect();
    };
  }, [room, sessionStarted, liveKitSession, appConfig.isPreConnectBufferEnabled]);

  // Keyboard event handlers for push-to-talk
  useEffect(() => {
    if (!pushToTalkManager || !sessionStarted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Spacebar for push-to-talk, but not when typing in inputs
      if (event.code === 'Space' && !event.repeat && event.target === document.body) {
        event.preventDefault();
        if (!isPushToTalkActive) {
          pushToTalkManager.startTurn();
          setIsPushToTalkActive(true);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' && event.target === document.body) {
        event.preventDefault();
        if (isPushToTalkActive) {
          pushToTalkManager.endTurn();
          setIsPushToTalkActive(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [pushToTalkManager, sessionStarted, isPushToTalkActive]);

  const handleStartCall = useCallback(async () => {
    if (!authData) {
      toastAlert({
        title: 'Authentication required',
        description: 'Please log in first to start a call.',
      });
      return;
    }

    setIsCreatingSession(true);
    try {
      const sessionData = await createLiveKitSession(authData.access_token);

      setLiveKitSession(sessionData);
      setSessionStarted(true);
    } catch (error) {
      console.error('Failed to create LiveKit session:', error);
      toastAlert({
        title: 'Failed to start session',
        description: 'Could not create LiveKit session. Please try again.',
      });
    } finally {
      setIsCreatingSession(false);
    }
  }, [authData]);

  const { startButtonText } = appConfig;

  return (
    <>
      <MotionWelcome
        key="welcome"
        startButtonText={isCreatingSession ? 'Creating session...' : startButtonText}
        onStartCall={handleStartCall}
        onAuthSuccess={useCallback((authData: AuthData) => {
          setAuthData(authData);
          setUserId(authData.user.id);
        }, [])}
        isLoading={isCreatingSession}
        disabled={sessionStarted}
        initial={{ opacity: 0 }}
        animate={{ opacity: sessionStarted ? 0 : 1 }}
        transition={{ duration: 0.5, ease: 'linear', delay: sessionStarted ? 0 : 0.5 }}
      />

      <RoomContext.Provider value={room}>
        <RoomAudioRenderer />
        <StartAudio label="Start Audio" />
        {/* --- */}
        <MotionSessionView
          key="session-view"
          appConfig={appConfig}
          disabled={!sessionStarted}
          sessionStarted={sessionStarted}
          pushToTalkManager={pushToTalkManager}
          isPushToTalkActive={isPushToTalkActive}
          onPushToTalkStateChange={setIsPushToTalkActive}
          initial={{ opacity: 0 }}
          animate={{ opacity: sessionStarted ? 1 : 0 }}
          transition={{
            duration: 0.5,
            ease: 'linear',
            delay: sessionStarted ? 0.5 : 0,
          }}
        />
      </RoomContext.Provider>

      <Toaster />
    </>
  );
}
