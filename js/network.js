export class NetworkManager {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.isHost = false;
    this.roomId = null;

    this.onOpen = null;
    this.onConnect = null;
    this.onData = null;
    this.onClose = null;
  }

  createRoom() {
    const id = 'host-' + Math.random().toString(36).substring(2, 10);
    this.roomId = id;
    this.isHost = true;
    this.initPeer(id);
  }

  joinRoom(hostId) {
    this.roomId = hostId;
    this.isHost = false;
    this.initPeer('guest-' + Math.random().toString(36).substring(2, 10));
  }

  initPeer(id) {
    this.peer = new Peer(id, {
      host: '0.peerjs.com',      // официальный сигнальный сервер
      port: 443,
      secure: true,
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ]
      }
    });

    this.peer.on('open', (peerId) => {
      console.log('Peer открыт, мой ID:', peerId);
      if (this.onOpen) this.onOpen(peerId);
      if (!this.isHost) {
        this.connectToHost(this.roomId);
      }
    });

    this.peer.on('connection', (conn) => {
      console.log('Входящее соединение от:', conn.peer);
      this.setupConnection(conn);
    });

    this.peer.on('error', (err) => {
      console.error('PeerJS ошибка:', err);
    });
  }

  connectToHost(hostId) {
    const conn = this.peer.connect(hostId, {
      reliable: true,
    });
    this.setupConnection(conn);
  }

  setupConnection(conn) {
    conn.on('open', () => {
      console.log('DataChannel открыт');
      this.connection = conn;
      if (this.onConnect) this.onConnect();
    });

    conn.on('data', (data) => {
      if (this.onData) this.onData(data);
    });

    conn.on('close', () => {
      console.log('DataChannel закрыт');
      if (this.onClose) this.onClose();
    });

    conn.on('error', (err) => {
      console.error('DataChannel ошибка:', err);
    });
  }

  send(data) {
    if (this.connection && this.connection.open) {
      this.connection.send(data);
    }
  }
}