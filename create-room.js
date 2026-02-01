// 방 만들기 페이지
// 완료 버튼 클릭 시 book-data에 저장 후 해당 방으로 이동

function $(sel) {
  return document.querySelector(sel);
}

function wireEvents() {
  const completeBtn = $("#completeBtn");
  const roomNameInput = $("#roomNameInput");

  completeBtn?.addEventListener("click", () => {
    const name = roomNameInput?.value?.trim() || "";
    const title = name || "새 독서모임";
    const newRoom = addRoom(title);
    window.location.href = `room.html?roomId=${newRoom.id}`;
  });

  roomNameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      completeBtn?.click();
    }
  });
}

wireEvents();
