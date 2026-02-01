// ========== 방 데이터 (book-data.js 기반, URL roomId 사용) ==========
const params = new URLSearchParams(window.location.search);
const currentRoomId = params.get("roomId") || "";

let room = getRoomById(currentRoomId);
if (!room) {
  window.location.href = "home.html";
  throw new Error("Invalid roomId, redirecting to home");
}

function getRoomMemberState() {
  return getRoomState(currentRoomId);
}

function persistMemberState(memberId, state) {
  if (state) saveRoomState(currentRoomId, memberId, state);
}

// ========== 앱 상태 (계정 전환 시 변경) ==========
const VIEW_AS_KEY = "bookRoomViewAs";
let myId = (() => {
  try {
    const saved = sessionStorage.getItem(VIEW_AS_KEY);
    if (saved === "me" || saved === "friend") return saved;
  } catch (_) {}
  return "me";
})();
let expandedMemberId = null; // 완독된 그룹원 카드 확장 시 표시할 멤버 ID

// 그룹원 색상 풀
const memberColors = ["#F95100", "#FEB8DD", "#8686FE", "#05D88F", "#037B93", "#FBC736"];

function getMemberColor(memberId) {
  const index = memberId.charCodeAt(memberId.length - 1) % memberColors.length;
  return memberColors[index];
}

// ========== 데이터 접근 (book-data.js) ==========
function getMembers() {
  const memberState = getRoomMemberState();
  return room.memberIds.map((id) => {
    const u = getUser(id);
    const s = memberState[id];
    return {
      id,
      nickname: u.nickname,
      current_page: s?.current_page ?? 0,
      is_finished: s?.is_finished ?? false,
      color: getMemberColor(id),
    };
  });
}

function ensureState(id) {
  const memberState = getRoomMemberState();
  if (!memberState[id]) {
    const defaultState = {
      current_page: 0,
      is_finished: false,
      rating: 0,
      comment: "",
      photos: [],
    };
    saveRoomState(currentRoomId, id, defaultState);
    return defaultState;
  }
  return memberState[id];
}

function $(sel) {
  return document.querySelector(sel);
}

function renderRoom() {
  const titleEl = $("#roomTitle");
  if (titleEl) titleEl.textContent = room.title;

  const coverMount = $("#bookCover");
  coverMount.innerHTML = "";
  if (room.currentBookCover) {
    const img = document.createElement("img");
    img.src = room.currentBookCover;
    img.alt = "현재 책";
    coverMount.appendChild(img);
  } else {
    const span = document.createElement("span");
    span.className = "book-placeholder-text";
    span.innerHTML = "아직 선택된 책이 없어요.<br>책 검색으로 추가해 주세요.";
    coverMount.appendChild(span);
  }

  const indexMount = $("#bookPhotoIndex");
  if (indexMount) {
    const membersWithPhotos = room.memberIds.filter((memberId) => {
      const state = ensureState(memberId);
      return (state.photos || []).length > 0;
    });
    indexMount.innerHTML = membersWithPhotos
      .map(
        (memberId) =>
          `<div class="book-photo-index-chip" style="background: ${getMemberColor(memberId)}" title="${getUser(memberId)?.nickname || memberId}"></div>`
      )
      .join("");
  }

  const list = $("#membersList");
  list.innerHTML = "";

  const members = getMembers();
  const sortedMembers = [
    ...members.filter((m) => m.id === myId),
    ...members.filter((m) => m.id !== myId),
  ];

  sortedMembers.forEach((m, index) => {
    const state = ensureState(m.id);
    state.current_page = m.current_page;
    state.is_finished = m.is_finished;

    const li = document.createElement("li");
    // 완독/읽는 중 상태에 따라 정렬 클래스 추가
    li.className = `member-item ${state.is_finished ? "finished" : "reading"}`;

    const isMain = m.id === myId;
    if (isMain) {
      if (state.is_finished) {
        // 완독 상태: fin! + 별점 + 한줄평 + 인풋
        li.innerHTML = `
          <div class="member-row main finished-card">
            <div class="member-main-top-wrap">
              <div class="member-chip" style="background: ${m.color}">${m.nickname}</div>
              <div class="member-main-top">fin!</div>
            </div>
            <div class="member-main-bottom-wrap">
              <div class="member-review-block">
                <div class="member-stars-row">
                  <span class="member-review-label">별점</span>
                  <div class="member-stars" id="myStars">
                    ${[1, 2, 3, 4, 5]
                      .map(
                        (v) =>
                          `<button type="button" class="member-star-btn ${
                            state.rating >= v ? "on" : ""
                          }" data-value="${v}">★</button>`
                      )
                      .join("")}
                  </div>
                </div>
                <div class="member-comment-row">
                  <span class="member-review-label">한줄평</span>
                </div>
                <textarea
                  class="member-comment-input"
                  id="myCommentInput"
                  placeholder="한줄평을 입력하세요"
                  rows="1"
                >${state.comment || ""}</textarea>
              </div>
            </div>
          </div>
        `;
      } else {
        // 읽는 중: 페이지 입력 필드와 완독 버튼
        li.innerHTML = `
          <div class="member-row main">
            <div class="member-main-top-wrap">
              <div class="member-chip" style="background: ${m.color}">${m.nickname}</div>
              <div class="member-main-top">READING...</div>
            </div>
            <div class="member-main-bottom-wrap">
              <div class="member-main-bottom">
                <span>지금</span>
                <input
                  type="number"
                  min="0"
                  class="member-page-input"
                  id="myPageInput"
                  value="${state.current_page || 0}"
                  placeholder="0"
                />
                <span>p 까지 읽었어요.</span>
              </div>
              <button class="member-finished-btn" id="myFinishedBtn" type="button">다읽었다!</button>
            </div>
          </div>
        `;
      }
    } else {
      const statusText = state.is_finished
        ? "완독!"
        : `reading... (<span class="member-page-num">${state.current_page}</span>p)`;
      const isExpanded = expandedMemberId === m.id;
      const isFinished = state.is_finished;

      if (isFinished) {
        // 완독: 클릭 시 카드가 아래로 펼쳐져 별점·한줄평 표시 (내 완독 카드와 동일 구조)
        li.innerHTML = `
          <div class="member-row main finished-card member-row-other ${isExpanded ? "expanded" : ""}" data-id="${m.id}">
            <div class="member-main-top-wrap member-main-top-wrap-other">
              <button class="member-chip js-toggle-expand" style="background: ${m.color}" data-id="${m.id}">${m.nickname}</button>
              <div class="member-main-top">fin!</div>
              <button class="member-expand-hint js-toggle-expand" data-id="${m.id}" aria-label="펼치기">▼</button>
            </div>
            ${isExpanded ? `
            <div class="member-main-bottom-wrap">
              <div class="member-review-block">
                <div class="member-stars-row">
                  <span class="member-review-label">별점</span>
                  <div class="member-stars-display">${"★".repeat(state.rating || 0)}${"☆".repeat(5 - (state.rating || 0))}</div>
                </div>
                <div class="member-comment-row">
                  <span class="member-review-label">한줄평</span>
                </div>
                <div class="member-comment-readonly">${(state.comment || "").replace(/</g, "&lt;").replace(/>/g, "&gt;") || "(없음)"}</div>
              </div>
            </div>
            ` : ""}
          </div>
        `;
      } else {
        // 읽는 중: 칩 + 상태 표시
        li.innerHTML = `
          <div class="member-row">
            <div class="member-chip" style="background: ${m.color}">${m.nickname}</div>
            <div class="member-status">${statusText}</div>
          </div>
        `;
      }
    }

    list.appendChild(li);
  });

  // 본인 카드의 입력 필드와 버튼에 이벤트 연결
  const myPageInput = document.getElementById("myPageInput");
  if (myPageInput) {
    myPageInput.addEventListener("change", (e) => {
      const value = Number(e.target.value) || 0;
      const state = ensureState(myId);
      state.current_page = value;
      persistMemberState(myId, state);
      renderRoom();
    });
  }

  const myFinishedBtn = document.getElementById("myFinishedBtn");
  if (myFinishedBtn) {
    myFinishedBtn.addEventListener("click", () => {
      const state = ensureState(myId);
      state.is_finished = true;
      persistMemberState(myId, state);
      renderRoom();
    });
  }

  // 완독 상태일 때 별점 버튼 이벤트
  document.querySelectorAll(".member-star-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = Number(btn.getAttribute("data-value"));
      const state = ensureState(myId);
      state.rating = v;
      persistMemberState(myId, state);
      renderRoom();
    });
  });

  // 완독 상태일 때 한줄평 - Auto-expanding textarea (스크롤 없이 내용만큼 아래로 확장)
  const myCommentInput = document.getElementById("myCommentInput");
  if (myCommentInput) {
    const resizeComment = (ta) => {
      ta.style.height = "0px";
      const h = ta.scrollHeight;
      ta.style.height = h + "px";
    };
    myCommentInput.addEventListener("input", (e) => {
      const state = ensureState(myId);
      state.comment = e.target.value;
      persistMemberState(myId, state);
      resizeComment(e.target);
    });
    myCommentInput.addEventListener("paste", (e) => {
      setTimeout(() => resizeComment(e.target), 0);
    });
    // 초기 로드 시 기존 내용이 있으면 높이 맞춤
    requestAnimationFrame(() => resizeComment(myCommentInput));
  }

  // 완독된 그룹원 카드: 클릭 시 확장/축소
  document.querySelectorAll(".js-toggle-expand").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const memberId = btn.getAttribute("data-id");
      expandedMemberId = expandedMemberId === memberId ? null : memberId;
      renderRoom();
    });
  });
}

function wireAccountSwitch() {
  const btnMe = document.getElementById("btnViewAsMe");
  const btnFriend = document.getElementById("btnViewAsFriend");
  if (btnMe) {
    btnMe.addEventListener("click", () => {
      myId = "me";
      sessionStorage.setItem(VIEW_AS_KEY, "me");
      btnMe.classList.add("active");
      if (btnFriend) btnFriend.classList.remove("active");
      renderRoom();
    });
  }
  if (btnFriend) {
    btnFriend.addEventListener("click", () => {
      myId = "friend";
      sessionStorage.setItem(VIEW_AS_KEY, "friend");
      btnFriend.classList.add("active");
      if (btnMe) btnMe.classList.remove("active");
      renderRoom();
    });
  }
  // 초기 활성 상태 (book-photos에서 돌아와도 유지)
  if (btnMe) btnMe.classList.toggle("active", myId === "me");
  if (btnFriend) btnFriend.classList.toggle("active", myId === "friend");
}

function wireBookButton() {
  const bookBtn = document.getElementById("bookButton");
  if (!bookBtn) return;
  bookBtn.addEventListener("click", () => {
    syncPhotosFromSessionStorage();
    // 모든 그룹원의 photos를 모아서 book-photos에 전달 (친구도 내가 올린 사진 볼 수 있음)
    const photos = [];
    room.memberIds.forEach((memberId) => {
      const state = ensureState(memberId);
      (state.photos || []).forEach((src) => {
        photos.push({ src, memberId });
      });
    });
    sessionStorage.setItem(
      "bookPhotosData",
      JSON.stringify({
        roomId: currentRoomId,
        photos,
        roomTitle: room.title,
        currentUserId: myId,
      })
    );
    window.location.href = "book-photos.html";
  });
}

function syncPhotosFromSessionStorage() {
  try {
    const raw = sessionStorage.getItem("bookPhotosData");
    if (raw) {
      const data = JSON.parse(raw);
      if (data.roomId !== currentRoomId) return;
      const photos = data.photos || [];
      if (photos.length) {
        room.memberIds.forEach((memberId) => {
          const state = ensureState(memberId);
          state.photos = photos
            .filter((p) => {
              if (typeof p === "string") return memberId === data.currentUserId;
              if (typeof p === "object" && p.memberId) return p.memberId === memberId;
              return memberId === data.currentUserId;
            })
            .map((p) => (typeof p === "string" ? p : p.src));
          persistMemberState(memberId, state);
        });
      }
    }
  } catch (_) {}
}

document.addEventListener("DOMContentLoaded", () => {
  // 새로고침(reload)일 때만 사진 초기화. 뒤로가기/사람 전환 시에는 유지
  const navEntry = performance.getEntriesByType?.("navigation")?.[0];
  if (navEntry?.type === "reload") {
    sessionStorage.removeItem("bookPhotosData");
  }
  wireAccountSwitch();
  wireBookButton();
  renderRoom();
});

// book-photos에서 돌아왔을 때 sessionStorage → mockMemberState 동기화 (뒤로가기/사람 전환 시에도 유지)
window.addEventListener("pageshow", () => {
  syncPhotosFromSessionStorage();
  renderRoom();
});