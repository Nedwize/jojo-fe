// Push-to-Talk Manager for LiveKit Room
import type { Room } from 'livekit-client';

export class PushToTalkManager {
  private room: Room;
  private isRecording: boolean = false;

  constructor(room: Room) {
    this.room = room;
  }

  private getAgentIdentity(): string | null {
    // Look for any participant marked as agent
    for (const participant of this.room.remoteParticipants.values()) {
      console.log('🔍 Participant:', participant.identity);
      if (participant.isAgent || participant.identity.includes('agent')) {
        return participant.identity;
      }
    }
    return null;
  }

  async startTurn(): Promise<void> {
    if (this.isRecording) return;

    const agentIdentity = this.getAgentIdentity();
    if (!agentIdentity) {
      console.warn('No agent found, cannot start push-to-talk');
      // Still enable microphone for basic functionality
      await this.room.localParticipant.setMicrophoneEnabled(true);
      this.isRecording = true;
      console.log('🎤 Started recording (no agent RPC)');
      return;
    }

    try {
      await this.room.localParticipant.performRpc({
        destinationIdentity: agentIdentity,
        method: 'start_turn',
        payload: '',
      });

      this.isRecording = true;
      console.log('🎤 Started recording user turn');

      // Enable microphone for user input
      await this.room.localParticipant.setMicrophoneEnabled(true);
    } catch (error) {
      console.error('Failed to start turn:', error);
      // Fallback: just enable microphone
      await this.room.localParticipant.setMicrophoneEnabled(true);
      this.isRecording = true;
      console.log('🎤 Started recording (fallback)');
    }
  }

  async endTurn(): Promise<void> {
    if (!this.isRecording) return;

    const agentIdentity = this.getAgentIdentity();
    if (!agentIdentity) {
      // Just disable microphone if no agent
      await this.room.localParticipant.setMicrophoneEnabled(false);
      this.isRecording = false;
      console.log('🎤 Ended recording (no agent RPC)');
      return;
    }

    try {
      await this.room.localParticipant.performRpc({
        destinationIdentity: agentIdentity,
        method: 'end_turn',
        payload: '',
      });

      this.isRecording = false;
      console.log('🎤 Ended user turn');

      // Disable microphone
      await this.room.localParticipant.setMicrophoneEnabled(false);
    } catch (error) {
      console.error('Failed to end turn:', error);
      // Fallback: just disable microphone
      await this.room.localParticipant.setMicrophoneEnabled(false);
      this.isRecording = false;
      console.log('🎤 Ended recording (fallback)');
    }
  }

  async cancelTurn(): Promise<void> {
    if (!this.isRecording) return;

    const agentIdentity = this.getAgentIdentity();
    if (!agentIdentity) {
      // Just disable microphone if no agent
      await this.room.localParticipant.setMicrophoneEnabled(false);
      this.isRecording = false;
      console.log('🎤 Cancelled recording (no agent RPC)');
      return;
    }

    try {
      await this.room.localParticipant.performRpc({
        destinationIdentity: agentIdentity,
        method: 'cancel_turn',
        payload: '',
      });

      this.isRecording = false;
      console.log('🎤 Cancelled user turn');

      await this.room.localParticipant.setMicrophoneEnabled(false);
    } catch (error) {
      console.error('Failed to cancel turn:', error);
      // Fallback: just disable microphone
      await this.room.localParticipant.setMicrophoneEnabled(false);
      this.isRecording = false;
      console.log('🎤 Cancelled recording (fallback)');
    }
  }

  get isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}
