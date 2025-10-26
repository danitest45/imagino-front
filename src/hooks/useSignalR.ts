import { useEffect, useRef, useState } from 'react';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  IHttpConnectionOptions,
} from '@microsoft/signalr';
import { API_BASE_URL } from '../lib/config';

export interface JobUpdate {
  jobId?: string;
  id?: string;
  status?: string | null;
  imageUrls?: string[] | null;
  resultImageUrls?: string[] | null;
  imageUrl?: string | null;
  [key: string]: unknown;
}

export interface UseSignalROptions {
  /**
   * Called when the hub emits a JobCompleted event.
   */
  onJobCompleted?: (job: JobUpdate) => void;
  /**
   * Called after the connection is re-established.
   */
  onReconnected?: (connectionId?: string) => void;
  /**
   * Called when the connection closes.
   */
  onClose?: (error?: Error) => void;
  /**
   * Allows consumers to customize the SignalR connection options.
   */
  connectionOptions?: IHttpConnectionOptions;
}

export interface UseSignalRResult {
  connection: HubConnection | undefined;
  connectionState: HubConnectionState;
}

export function useSignalR(
  authToken: string | null,
  { onJobCompleted, onReconnected, onClose, connectionOptions }: UseSignalROptions = {},
): UseSignalRResult {
  const connection = useRef<HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<HubConnectionState>(HubConnectionState.Disconnected);

  const signalRPath = process.env.NEXT_PUBLIC_SIGNALR_PATH ?? '/jobsHub';
  const normalizedPath = signalRPath.startsWith('/') ? signalRPath : `/${signalRPath}`;
  const hubUrl = `${API_BASE_URL}${normalizedPath}`;

  useEffect(() => {
    if (!authToken) {
      return;
    }

    const builder = new HubConnectionBuilder().withUrl(hubUrl, {
      accessTokenFactory: () => authToken,
      withCredentials: true,
      ...(connectionOptions ?? {}),
    });

    const builtConnection = builder.withAutomaticReconnect().build();
    connection.current = builtConnection;
    setConnectionState(builtConnection.state);

    const handleStateChange = () => {
      setConnectionState(builtConnection.state);
    };

    builtConnection.onreconnected((id) => {
      handleStateChange();
      onReconnected?.(id ?? undefined);
    });

    builtConnection.onclose((error) => {
      handleStateChange();
      if (error instanceof Error) {
        onClose?.(error);
      } else if (error) {
        onClose?.(new Error(String(error)));
      } else {
        onClose?.();
      }
    });

    builtConnection
      .start()
      .then(handleStateChange)
      .catch((err) => {
        console.error('SignalR connection failed to start', err);
        onClose?.(err instanceof Error ? err : new Error(String(err)));
      });

    return () => {
      void builtConnection.stop();
      setConnectionState(HubConnectionState.Disconnected);
      connection.current = null;
    };
  }, [authToken, hubUrl, onReconnected, onClose, connectionOptions]);

  useEffect(() => {
    if (!connection.current || !onJobCompleted) {
      return;
    }

    const handler = (job: JobUpdate) => {
      onJobCompleted(job);
    };

    connection.current.on('JobCompleted', handler);

    return () => {
      connection.current?.off('JobCompleted', handler);
    };
  }, [onJobCompleted, connectionState]);

  return {
    connection: connection.current ?? undefined,
    connectionState,
  };
}

