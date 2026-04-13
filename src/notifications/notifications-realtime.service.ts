import { Injectable, MessageEvent } from '@nestjs/common';
import { interval, map, merge, Observable, Subject } from 'rxjs';

type RealtimeNotificationPayload = {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  actionUrl: string | null;
  metadata: unknown;
  isRead: boolean;
  createdAt: Date;
};

@Injectable()
export class NotificationsRealtimeService {
  private readonly channels = new Map<string, Subject<MessageEvent>>();

  streamForUser(userId: string): Observable<MessageEvent> {
    const subject = this.getOrCreateChannel(userId);
    const heartbeat$ = interval(25_000).pipe(
      map(() => ({
        type: 'heartbeat',
        data: { timestamp: new Date().toISOString() },
      }) as MessageEvent),
    );

    return merge(subject.asObservable(), heartbeat$);
  }

  publishToUser(userId: string, payload: RealtimeNotificationPayload) {
    const channel = this.channels.get(userId);
    if (!channel) {
      return;
    }

    channel.next({
      type: 'notification',
      data: payload,
    } as MessageEvent);
  }

  private getOrCreateChannel(userId: string) {
    const existing = this.channels.get(userId);
    if (existing) {
      return existing;
    }

    const created = new Subject<MessageEvent>();
    this.channels.set(userId, created);
    return created;
  }
}
