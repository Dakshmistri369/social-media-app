import { io } from 'socket.io-client';
import { SERVER_URL } from './api';

export const socket = io(SERVER_URL, {
  autoConnect: false,
});
