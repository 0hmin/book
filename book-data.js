// 공유 방 데이터 (sessionStorage 기반, DB 연동 시 교체 용이)
const BOOK_DATA_KEY = "bookRoomsData";

// 전역 유저 (방마다 멤버 ID로 참조)
const USERS = {
  me: { id: "me", nickname: "미농", isHost: true },
  friend: { id: "friend", nickname: "친구1", isHost: false },
};

// 기본 더미 데이터
const DEFAULT_ROOMS = [
  { id: "1", title: "다그닥 독서모임", memberIds: ["me", "friend"] },
  { id: "2", title: "주말 책방", memberIds: ["me"] },
];

const DEFAULT_ROOM_STATES = {
  "1": {
    me: { current_page: 0, is_finished: false, rating: 0, comment: "", photos: [] },
    friend: {
      current_page: 120,
      is_finished: true,
      rating: 4,
      comment: "마지막 장면이 인상적이었어요. 추천합니다!",
      photos: [],
    },
  },
  "2": {
    me: { current_page: 0, is_finished: false, rating: 0, comment: "", photos: [] },
  },
};

function getRoomsData() {
  try {
    const raw = sessionStorage.getItem(BOOK_DATA_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.rooms && Array.isArray(data.rooms)) return data;
    }
  } catch (_) {}
  return {
    rooms: JSON.parse(JSON.stringify(DEFAULT_ROOMS)),
    roomStates: JSON.parse(JSON.stringify(DEFAULT_ROOM_STATES)),
  };
}

function saveRoomsData(data) {
  sessionStorage.setItem(BOOK_DATA_KEY, JSON.stringify(data));
}

function getRoomById(roomId) {
  const data = getRoomsData();
  return data.rooms.find((r) => r.id === roomId) || null;
}

function getRoomState(roomId) {
  const data = getRoomsData();
  return data.roomStates[roomId] || {};
}

function saveRoomState(roomId, memberId, state) {
  const data = getRoomsData();
  if (!data.roomStates[roomId]) data.roomStates[roomId] = {};
  data.roomStates[roomId][memberId] = state;
  saveRoomsData(data);
}

function addRoom(title) {
  const data = getRoomsData();
  const id = String(Date.now());
  const newRoom = { id, title: title || "새 독서모임", memberIds: ["me"] };
  data.rooms.push(newRoom);
  data.roomStates[id] = {
    me: { current_page: 0, is_finished: false, rating: 0, comment: "", photos: [] },
  };
  saveRoomsData(data);
  return newRoom;
}

function updateRoom(roomId, updates) {
  const data = getRoomsData();
  const room = data.rooms.find((r) => r.id === roomId);
  if (!room) return null;
  Object.assign(room, updates);
  saveRoomsData(data);
  return room;
}

function getUser(memberId) {
  return USERS[memberId] || { id: memberId, nickname: memberId, isHost: false };
}
