// 독서모임 홈 - 책 인덱스 UI
// nickname: id="user-nickname"에 표시되는 닉네임
// 방 만들기(btn-pink): 항상 표시, 클릭 시 console.log
// btn-blue, btn-green, btn-yellow: 내가 속한 방 개수만큼 순서대로 표시 (최대 3개)

function $(sel) {
  return document.querySelector(sel);
}

// 닉네임 (book-data.js USERS.me에서 가져옴)
const me = getUser("me");
let nickname = me?.nickname || "미농";

// 내가 속한 방 목록 (book-data.js sessionStorage에서 로드, 최대 3개)
function getMyRooms() {
  const data = getRoomsData();
  return (data.rooms || []).slice(0, 3).map((r) => ({ id: r.id, name: r.title }));
}

const ROOM_BUTTON_ORDER = ["btn-blue", "btn-green", "btn-yellow"];

function render() {
  const nicknameEl = $("#user-nickname");
  if (nicknameEl) nicknameEl.textContent = nickname;

  const btnPink = $("#btn-pink");
  const btnBlue = $("#btn-blue");
  const btnGreen = $("#btn-green");
  const btnYellow = $("#btn-yellow");
  const labelBlue = $("#labelBlue");
  const labelGreen = $("#labelGreen");
  const labelYellow = $("#labelYellow");

  // 방만들기(핑크): 항상 표시
  btnPink?.classList.remove("hidden");

  // 방 버튼: myRooms 개수만큼 순서대로 표시
  const myRooms = getMyRooms();
  const buttons = [btnBlue, btnGreen, btnYellow];
  const labels = [labelBlue, labelGreen, labelYellow];

  ROOM_BUTTON_ORDER.forEach((id, i) => {
    const btn = $(`#${id}`);
    const label = labels[i];
    if (i < myRooms.length) {
      btn?.classList.remove("hidden");
      if (label) {
        const name = myRooms[i].name;
        label.textContent = name.length > 6 ? name.slice(0, 6) + "..." : name;
        label.classList.remove("hidden");
      }
    } else {
      btn?.classList.add("hidden");
      if (label) {
        label.textContent = "";
        label.classList.add("hidden");
      }
    }
  });
}

function wireEvents() {
  // 방만들기(핑크): 방 만들기 페이지로 이동
  $("#btn-pink")?.addEventListener("click", () => {
    window.location.href = "create-room.html";
  });

  // 방 버튼: 클릭 시 해당 방으로 이동
  const myRooms = getMyRooms();
  ROOM_BUTTON_ORDER.forEach((id, i) => {
    const btn = $(`#${id}`);
    btn?.addEventListener("click", () => {
      if (i >= myRooms.length) return;
      const room = myRooms[i];
      window.location.href = `room.html?roomId=${room.id}`;
    });
  });
}

function init() {
  render();
  wireEvents();
}

init();
