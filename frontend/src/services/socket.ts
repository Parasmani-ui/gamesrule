import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Set up event forwarding to listeners
    this.setupEventForwarding();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Join a session
  joinSession(sessionId: string, participantId: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('join_session', { sessionId, participantId });
  }

  // Send player action
  sendAction(
    sessionId: string,
    participantId: string,
    actionType: string,
    payload: any
  ): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('player_action', {
      sessionId,
      participantId,
      actionType,
      payload,
    });
  }

  // Facilitator: manually advance round
  advanceRound(sessionId: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('facilitator_advance_round', { sessionId });
  }

  // Facilitator: Get participants overview
  getParticipantsOverview(sessionId: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    this.socket.emit('facilitator_get_participants', { sessionId });
  }

  // Subscribe to events
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Also subscribe on socket if already connected
    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  // Unsubscribe from events
  off(event: string, callback?: Function): void {
    if (callback) {
      const callbacks = this.listeners.get(event) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
      if (this.socket) {
        this.socket.off(event, callback as any);
      }
    } else {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  private setupEventForwarding(): void {
    if (!this.socket) return;

    // Forward all registered events to listeners
    for (const [event, callbacks] of this.listeners.entries()) {
      for (const callback of callbacks) {
        this.socket.on(event, callback as any);
      }
    }
  }
}

export const socketService = new SocketService();

